import type { SessionUser } from "@/lib/session";
import { TemplateError } from "@/lib/document-template-placeholders";
import { academic, historyData, reportData } from "@/lib/document-templates/data";
import { issuedDocument } from "@/services/document-templates";
import { paymentReceipt } from "@/services/payment-receipt";
import { buildAcademicHistoryPdf, buildEnrollmentDeclarationPdf, buildReportCardPdf } from "@/lib/academic-documents";
import { auditSourceFromRole, recordAuditLog } from "@/lib/audit";
import { canDownload, documentTypes, getDocumentPolicies, isDocumentType } from "@/lib/document-policy";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildGradeRows } from "@/lib/student-academics";
import { getStudentAcademicDocumentData, summarizeEnrollment } from "@/services/school-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function responseError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

async function resolveStudentId(session: SessionUser, requestedStudentId: string | null) {
  if (session.role === "ADMIN") {
    return requestedStudentId;
  }

  if (session.role === "ALUNO") {
    const student = await prisma.student.findFirst({
      where: { schoolId: session.schoolId, userId: session.id },
      select: { id: true }
    });
    return student?.id ?? null;
  }

  if (session.role === "RESPONSAVEL") {
    const guardian = await prisma.guardian.findFirst({
      where: { schoolId: session.schoolId, userId: session.id },
      include: {
        students: {
          include: { student: { select: { id: true } } },
          orderBy: [{ isPrimary: "desc" }, { student: { fullName: "asc" } }]
        }
      }
    });
    const allowedStudents = guardian?.students.map((item) => item.student.id) ?? [];
    const selectedStudentId = requestedStudentId ?? allowedStudents[0] ?? null;

    return selectedStudentId && allowedStudents.includes(selectedStudentId) ? selectedStudentId : null;
  }

  return null;
}

function pdfResponse(document: { filename: string; bytes: Buffer }) {
  return new Response(new Uint8Array(document.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${document.filename.startsWith("previa-") ? "inline" : "attachment"}; filename="${document.filename}"`,
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ tipo: string }> }) {
  try { return await generate(request, (await params).tipo); }
  catch(error) {
    if(error instanceof TemplateError) return responseError(error.message,422);
    throw error;
  }
}

async function generate(request: Request, tipo: string) {
  const session = await getSession();
  if (!session) return responseError("Acesso não autenticado.", 401);
  if (!["ADMIN", "ALUNO", "RESPONSAVEL"].includes(session.role)) {
    return responseError("Perfil sem permissão para emitir documentos acadêmicos.", 403);
  }

  const url = new URL(request.url);
  const preview = url.searchParams.get("modelo");
  if (preview && session.role !== "ADMIN") return responseError("Prévia restrita à administração.",403);
  if (tipo === "recibo") return paymentReceipt(session,url.searchParams.get("chargeId") ?? "",preview);
  if (!isDocumentType(tipo)) return responseError("Documento não encontrado.", 404);
  const studentId = await resolveStudentId(session, url.searchParams.get("studentId"));
  if (!studentId) return responseError("Aluno não encontrado para este acesso.", session.role === "ADMIN" ? 400 : 403);

  if (session.role !== "ADMIN") {
    const policies = await getDocumentPolicies(session.schoolId);
    if (!canDownload(session.role, policies[documentTypes[tipo].type])) {
      return responseError("Solicite este documento à secretaria.", 403);
    }
  }
  const data = await getStudentAcademicDocumentData(session.schoolId, studentId);
  if (!data) return responseError("Aluno não encontrado.", 404);

  if (tipo === "historico") {
    if (!preview) await recordAuditLog(prisma, {
      schoolId: session.schoolId,
      actor: session,
      source: auditSourceFromRole(session.role),
      action: "document.generated",
      entity: "Student",
      entityId: studentId,
      metadata: {
        documentType: "historico",
        studentId,
        studentName: data.student.fullName
      }
    });
    return pdfResponse(await issuedDocument(session,"HISTORICO_ESCOLAR",historyData(data.student.school.name,data.history),preview,
      () => buildAcademicHistoryPdf({ schoolName: data.student.school.name, history: data.history })));
  }

  const selectedYear = Number(url.searchParams.get("ano")) || data.student.enrollments[0]?.academicYear.year;
  const enrollment =
    data.student.enrollments.find((item) => item.academicYear.year === selectedYear) ?? data.student.enrollments[0] ?? null;
  if (!enrollment) return responseError("Nenhuma matrícula encontrada para o aluno.", 404);

  if (tipo === "declaracao-matricula") {
    if (enrollment.status !== "ACTIVE") {
      return responseError("Declaração disponível apenas para matrícula ativa.", 409);
    }

    if (!preview) await recordAuditLog(prisma, {
      schoolId: session.schoolId,
      actor: session,
      source: auditSourceFromRole(session.role),
      action: "document.generated",
      entity: "Enrollment",
      entityId: enrollment.id,
      metadata: {
        documentType: "declaracao-matricula",
        studentId,
        studentName: data.student.fullName,
        academicYear: enrollment.academicYear.year
      }
    });

    return pdfResponse(
      await issuedDocument(session,"DECLARACAO_MATRICULA",{values:academic(data.student.school.name,data.student.fullName,enrollment)},preview,() => buildEnrollmentDeclarationPdf({
        schoolName: data.student.school.name,
        studentName: data.student.fullName,
        enrollment,
        guardianName: data.student.guardians[0]?.guardian.fullName
      }))
    );
  }

  const periods = enrollment.academicYear.periods;
  const requestedPeriod = url.searchParams.get("periodo") ?? "todos";
  const selectedPeriod = requestedPeriod === "todos" || periods.some((period) => period.id === requestedPeriod) ? requestedPeriod : "todos";
  const visiblePeriods = selectedPeriod === "todos" ? periods : periods.filter((period) => period.id === selectedPeriod);
  const selectedContextEnded =
    selectedPeriod === "todos" ? Boolean(enrollment.academicYear.closedAt) : visiblePeriods.length > 0 && visiblePeriods.every((period) => period.closedAt);
  const filteredGrades = enrollment.grades.filter((grade) => selectedPeriod === "todos" || grade.academicPeriod.id === selectedPeriod);
  const summary = summarizeEnrollment(enrollment, { isFinal: Boolean(enrollment.academicYear.closedAt) });
  const rows = buildGradeRows(filteredGrades, summary.attendanceRate, { isFinal: selectedContextEnded });

  if (!preview) await recordAuditLog(prisma, {
    schoolId: session.schoolId,
    actor: session,
    source: auditSourceFromRole(session.role),
    action: "document.generated",
    entity: "Enrollment",
    entityId: enrollment.id,
    metadata: {
      documentType: "boletim",
      studentId,
      studentName: data.student.fullName,
      academicYear: enrollment.academicYear.year,
      period: selectedPeriod === "todos" ? "todos" : visiblePeriods[0]?.name ?? selectedPeriod
    }
  });

  const report = {
      schoolName: data.student.school.name,
      studentName: data.student.fullName,
      enrollment,
      periods: visiblePeriods.map((period) => ({ id: period.id, name: period.name })),
      rows,
      summary,
      selectedPeriodLabel: selectedPeriod === "todos" ? "Todos os bimestres" : visiblePeriods[0]?.name ?? "Período selecionado"
  };
  return pdfResponse(await issuedDocument(session,"BOLETIM",reportData(report),preview,()=>buildReportCardPdf(report)));
}

