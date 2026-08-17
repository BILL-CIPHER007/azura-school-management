import bcrypt from "bcryptjs";
import {
  AttendanceStatus,
  CalendarEventType,
  PrismaClient,
  Shift,
  UserRole
} from "@prisma/client";
import { getDemoPassword, schoolConfig } from "../src/config/school";

const prisma = new PrismaClient();

const demoPassword = getDemoPassword();
const academicYearValue = schoolConfig.academic.academicYear;
const demoEmailDomain = schoolConfig.demo.emailDomain;

function schoolSlug() {
  return schoolConfig.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const subjects = [
  ["Língua Portuguesa", "POR"],
  ["Matemática", "MAT"],
  ["Ciências", "CIE"],
  ["História", "HIS"],
  ["Geografia", "GEO"],
  ["Inglês", "ING"]
] as const;

const teacherNames = [
  "Marina Andrade",
  "Rafael Nogueira",
  "Camila Torres",
  "Bruno Carvalho",
  "Helena Martins"
];

const classroomsSeed = [
  { name: "6º Ano A", gradeLevel: "6º Ano", shift: Shift.MATUTINO },
  { name: "7º Ano A", gradeLevel: "7º Ano", shift: Shift.MATUTINO },
  { name: "8º Ano A", gradeLevel: "8º Ano", shift: Shift.VESPERTINO },
  { name: "9º Ano A", gradeLevel: "9º Ano", shift: Shift.VESPERTINO }
];

const studentNames = [
  "João Rodrigues",
  "Ana Clara Lima",
  "Pedro Henrique Souza",
  "Laura Martins",
  "Miguel Fernandes",
  "Sofia Almeida",
  "Arthur Costa",
  "Helena Ribeiro",
  "Bernardo Rocha",
  "Valentina Teixeira",
  "Davi Moreira",
  "Alice Barbosa",
  "Theo Cardoso",
  "Isabella Monteiro",
  "Gabriel Castro",
  "Manuela Correia",
  "Lucas Mendes",
  "Lívia Azevedo",
  "Matheus Batista",
  "Maria Eduarda Dias",
  "Gustavo Campos",
  "Cecília Farias",
  "Enzo Duarte",
  "Yasmin Vieira",
  "Ravi Oliveira",
  "Clara Gomes",
  "Samuel Pires",
  "Luiza Freitas",
  "Nicolas Cunha",
  "Bianca Lopes",
  "Felipe Moraes",
  "Mariana Nunes"
];

function date(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function academicDate(monthDay: string) {
  return date(`${academicYearValue}-${monthDay}`);
}

function score(seed: number, offset: number) {
  return Number((6.1 + ((seed + offset) % 34) / 10).toFixed(1));
}

async function resetDatabase() {
  await prisma.auditLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.grade.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.teacherSubject.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.guardianStudent.deleteMany();
  await prisma.student.deleteMany();
  await prisma.guardian.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.classroom.deleteMany();
  await prisma.academicPeriod.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();
}

async function main() {
  await resetDatabase();

  const passwordHash = await bcrypt.hash(demoPassword, 10);
  const school = await prisma.school.create({
    data: {
      name: schoolConfig.name,
      slug: schoolSlug()
    }
  });

  const academicYear = await prisma.academicYear.create({
    data: {
      schoolId: school.id,
      year: academicYearValue,
      startsAt: academicDate("02-02"),
      endsAt: academicDate("12-18"),
      isActive: true
    }
  });

  const periods = await Promise.all(
    [
      [schoolConfig.academic.periodNames[0] ?? "1º Bimestre", "02-02", "04-17"],
      [schoolConfig.academic.periodNames[1] ?? "2º Bimestre", "04-27", "07-03"],
      [schoolConfig.academic.periodNames[2] ?? "3º Bimestre", "08-03", "10-09"],
      [schoolConfig.academic.periodNames[3] ?? "4º Bimestre", "10-19", "12-18"]
    ].map(([name, startsAt, endsAt], index) =>
      prisma.academicPeriod.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          name,
          startsAt: academicDate(startsAt),
          endsAt: academicDate(endsAt),
          sortOrder: index + 1
        }
      })
    )
  );

  const adminUser = await prisma.user.create({
    data: {
      schoolId: school.id,
      name: `Secretaria ${schoolConfig.shortName}`,
      email: schoolConfig.demo.users.ADMIN,
      passwordHash,
      role: UserRole.ADMIN
    }
  });

  const createdSubjects = await Promise.all(
    subjects.map(([name, code]) =>
      prisma.subject.create({
        data: {
          schoolId: school.id,
          name,
          code
        }
      })
    )
  );

  const createdClassrooms = await Promise.all(
    classroomsSeed.map((classroom) =>
      prisma.classroom.create({
        data: {
          schoolId: school.id,
          academicYearId: academicYear.id,
          ...classroom
        }
      })
    )
  );

  const teachers = [];
  for (const [index, fullName] of teacherNames.entries()) {
    const isDemoTeacher = index === 0;
    const user = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: fullName,
        email: isDemoTeacher
          ? schoolConfig.demo.users.PROFESSOR
          : `professor${index + 1}@${demoEmailDomain}`,
        passwordHash,
        role: UserRole.PROFESSOR
      }
    });

    teachers.push(
      await prisma.teacher.create({
        data: {
          schoolId: school.id,
          userId: user.id,
          fullName,
          email: user.email,
          phone: `(11) 9${index + 1200}-0000`
        }
      })
    );
  }

  const assignments = [];
  for (const classroom of createdClassrooms) {
    for (const [subjectIndex, subject] of createdSubjects.entries()) {
      assignments.push(
        await prisma.teacherSubject.create({
          data: {
            schoolId: school.id,
            teacherId: teachers[subjectIndex % teachers.length].id,
            subjectId: subject.id,
            classroomId: classroom.id
          }
        })
      );
    }
  }

  const enrollments = [];
  for (const [index, fullName] of studentNames.entries()) {
    const isDemoStudent = index === 0;
    const classroom = createdClassrooms[index % createdClassrooms.length];
    const studentUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: fullName,
        email: isDemoStudent
          ? schoolConfig.demo.users.ALUNO
          : `aluno${String(index + 1).padStart(2, "0")}@${demoEmailDomain}`,
        passwordHash,
        role: UserRole.ALUNO
      }
    });

    const student = await prisma.student.create({
      data: {
        schoolId: school.id,
        userId: studentUser.id,
        fullName,
        cpf: `000.000.0${String(index).padStart(2, "0")}-00`,
        birthDate: date(`201${index % 4}-0${(index % 8) + 1}-15`),
        gender: index % 2 === 0 ? "Masculino" : "Feminino",
        phone: `(11) 9${3000 + index}-0000`,
        email: studentUser.email,
        address: `Rua das Acácias, ${100 + index}`
      }
    });

    const guardianEmail = isDemoStudent
      ? schoolConfig.demo.users.RESPONSAVEL
      : `responsavel${String(index + 1).padStart(2, "0")}@${demoEmailDomain}`;
    const guardianUser = await prisma.user.create({
      data: {
        schoolId: school.id,
        name: `Responsável de ${fullName}`,
        email: guardianEmail,
        passwordHash,
        role: UserRole.RESPONSAVEL
      }
    });

    const guardian = await prisma.guardian.create({
      data: {
        schoolId: school.id,
        userId: guardianUser.id,
        fullName: `Responsável de ${fullName}`,
        cpf: `111.111.1${String(index).padStart(2, "0")}-11`,
        relation: index % 3 === 0 ? "Mãe" : index % 3 === 1 ? "Pai" : "Tutor",
        phone: `(11) 9${5000 + index}-0000`,
        email: guardianEmail
      }
    });

    await prisma.guardianStudent.create({
      data: {
        guardianId: guardian.id,
        studentId: student.id,
        isPrimary: true
      }
    });

    if (index === 1) {
      const firstGuardian = await prisma.guardian.findFirstOrThrow({
        where: { email: schoolConfig.demo.users.RESPONSAVEL, schoolId: school.id }
      });
      await prisma.guardianStudent.create({
        data: {
          guardianId: firstGuardian.id,
          studentId: student.id,
          isPrimary: false
        }
      });
    }

    enrollments.push(
      await prisma.enrollment.create({
        data: {
          schoolId: school.id,
          studentId: student.id,
          classroomId: classroom.id,
          academicYearId: academicYear.id,
          registration: `${academicYearValue}${String(index + 1).padStart(4, "0")}`,
          enrolledAt: academicDate("01-20"),
          status: "ACTIVE"
        }
      })
    );
  }

  for (const [enrollmentIndex, enrollment] of enrollments.entries()) {
    for (const subject of createdSubjects) {
      const subjectIndex = createdSubjects.findIndex((item) => item.id === subject.id);
      const teacher = teachers[subjectIndex % teachers.length];

      for (const period of periods) {
        const av1 = score(enrollmentIndex, period.sortOrder);
        const av2 = score(enrollmentIndex + 3, subjectIndex);
        const assignment = score(enrollmentIndex + 7, subjectIndex + period.sortOrder);
        const average = Number(((av1 + av2 + assignment) / 3).toFixed(1));

        await prisma.grade.create({
          data: {
            schoolId: school.id,
            enrollmentId: enrollment.id,
            subjectId: subject.id,
            academicPeriodId: period.id,
            teacherId: teacher.id,
            av1,
            av2,
            assignment,
            average
          }
        });
      }

      for (let day = 1; day <= 8; day += 1) {
        const status =
          (enrollmentIndex + subjectIndex + day) % 17 === 0
            ? AttendanceStatus.ABSENT
            : (enrollmentIndex + day) % 23 === 0
              ? AttendanceStatus.JUSTIFIED
              : AttendanceStatus.PRESENT;

        await prisma.attendance.create({
          data: {
            schoolId: school.id,
            enrollmentId: enrollment.id,
            classroomId: enrollment.classroomId,
            subjectId: subject.id,
            date: academicDate(`08-${String(day + 3).padStart(2, "0")}`),
            status
          }
        });
      }
    }
  }

  await prisma.announcement.createMany({
    data: [
      {
        schoolId: school.id,
        authorId: adminUser.id,
        title: "Reunião pedagógica",
        content: "A reunião de acompanhamento do bimestre acontecerá na próxima sexta-feira.",
        audience: "PROFESSORS"
      },
      {
        schoolId: school.id,
        authorId: adminUser.id,
        title: "Semana de avaliações",
        content: "As avaliações do 3º bimestre começam no dia 24 de agosto.",
        audience: "SCHOOL"
      },
      {
        schoolId: school.id,
        authorId: adminUser.id,
        title: "Entrega de boletins",
        content: "Os boletins parciais estarão disponíveis no portal a partir de segunda.",
        audience: "GUARDIANS"
      }
    ]
  });

  await prisma.calendarEvent.createMany({
    data: [
      {
        schoolId: school.id,
        academicYearId: academicYear.id,
        title: "Prova de Matemática",
        description: "Avaliação bimestral das turmas de 8º e 9º ano.",
        type: CalendarEventType.PROVA,
        startsAt: academicDate("08-24")
      },
      {
        schoolId: school.id,
        academicYearId: academicYear.id,
        title: "Reunião com responsáveis",
        description: "Encontro para acompanhamento acadêmico.",
        type: CalendarEventType.REUNIAO,
        startsAt: academicDate("08-28")
      },
      {
        schoolId: school.id,
        academicYearId: academicYear.id,
        title: "Feira de Ciências",
        description: "Mostra de projetos dos alunos.",
        type: CalendarEventType.EVENTO,
        startsAt: academicDate("09-12")
      }
    ]
  });

  await prisma.auditLog.createMany({
    data: [
      {
        schoolId: school.id,
        userId: adminUser.id,
        action: "seed.executed",
        entity: "School",
        entityId: school.id
      },
      {
        schoolId: school.id,
        userId: adminUser.id,
        action: "enrollment.created",
        entity: "Enrollment",
        entityId: enrollments[0].id
      }
    ]
  });

  console.log(`Seed concluído para ${schoolConfig.name}.`);
  console.log(`Senha demo: ${demoPassword}`);
  console.log(`Atribuições criadas: ${assignments.length}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
