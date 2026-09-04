import { schoolConfig } from "@/config/school";
import { prisma } from "@/lib/prisma";
import { optionalText } from "@/services/enrollment-registration";

export type GuardianUpdateErrorCode =
  | "cpf"
  | "cpf-duplicado"
  | "email-duplicado"
  | "email-usuario"
  | "responsavel";

export class GuardianUpdateError extends Error {
  constructor(public code: GuardianUpdateErrorCode, message: string) {
    super(message);
    this.name = "GuardianUpdateError";
  }
}

export type UpdateGuardianInput = {
  schoolId: string;
  actorUserId: string;
  guardianId: string;
  guardianName: string;
  guardianCpf?: string | null;
  guardianPhone?: string | null;
  guardianEmail?: string | null;
};

function cpfDigits(value?: string | null) {
  return value?.replace(/\D/g, "") ?? "";
}

function isValidCpfInput(value?: string | null) {
  const digits = cpfDigits(value);
  if (!digits) return true;
  if (digits.length !== 11) return false;
  return !/^(\d)\1{10}$/.test(digits);
}

async function cpfBelongsToAnotherGuardian(schoolId: string, guardianId: string, cpf?: string | null) {
  const digits = cpfDigits(cpf);
  if (!digits) return false;

  const guardians = await prisma.guardian.findMany({
    where: {
      schoolId,
      id: { not: guardianId },
      cpf: { not: null }
    },
    select: { cpf: true }
  });

  return guardians.some((guardian) => cpfDigits(guardian.cpf) === digits);
}

export async function updateGuardianRecord(input: UpdateGuardianInput) {
  const guardianName = optionalText(input.guardianName) ?? "";
  const guardianCpf = optionalText(input.guardianCpf ?? undefined);
  const guardianPhone = optionalText(input.guardianPhone ?? undefined);
  const guardianEmail = optionalText(input.guardianEmail ?? undefined)?.toLowerCase();

  if (!isValidCpfInput(guardianCpf)) {
    throw new GuardianUpdateError("cpf", "Informe um CPF valido para o responsavel.");
  }

  const guardian = await prisma.guardian.findFirst({
    where: { id: input.guardianId, schoolId: input.schoolId },
    select: { id: true, userId: true }
  });

  if (!guardian) {
    throw new GuardianUpdateError("responsavel", "Responsavel nao encontrado nesta escola.");
  }

  const [cpfConflict, guardianEmailConflict] = await Promise.all([
    cpfBelongsToAnotherGuardian(input.schoolId, guardian.id, guardianCpf),
    guardianEmail
      ? prisma.guardian.findFirst({
          where: {
            schoolId: input.schoolId,
            id: { not: guardian.id },
            email: guardianEmail
          },
          select: { id: true }
        })
      : null
  ]);

  if (cpfConflict) {
    throw new GuardianUpdateError("cpf-duplicado", "Ja existe outro responsavel com este CPF nesta escola.");
  }

  if (guardianEmailConflict) {
    throw new GuardianUpdateError("email-duplicado", "Ja existe outro responsavel com este e-mail nesta escola.");
  }

  if (guardianEmail) {
    const userEmailConflict = await prisma.user.findFirst({
      where: {
        schoolId: input.schoolId,
        email: guardianEmail,
        id: guardian.userId ? { not: guardian.userId } : undefined
      },
      select: { id: true }
    });

    if (userEmailConflict) {
      throw new GuardianUpdateError("email-usuario", "Este e-mail ja esta vinculado a outro usuario da escola.");
    }
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.guardian.update({
        where: { id: guardian.id },
        data: {
          fullName: guardianName,
          cpf: guardianCpf ?? null,
          phone: guardianPhone ?? null,
          email: guardianEmail ?? null
        }
      });

      if (guardian.userId) {
        await tx.user.update({
          where: { id: guardian.userId },
          data: {
            name: guardianName,
            email: guardianEmail ?? `responsavel.${guardian.id}@${schoolConfig.demo.emailDomain}`.toLowerCase()
          }
        });
      }

      await tx.auditLog.create({
        data: {
          schoolId: input.schoolId,
          userId: input.actorUserId,
          action: "guardian.updated",
          entity: "Guardian",
          entityId: guardian.id
        }
      });
    },
    { timeout: 10000 }
  );
}
