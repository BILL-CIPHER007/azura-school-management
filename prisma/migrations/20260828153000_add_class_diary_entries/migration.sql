-- CreateTable
CREATE TABLE "ClassDiaryEntry" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classroomId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassDiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassDiaryEntry_schoolId_classroomId_subjectId_teacherId_date_key" ON "ClassDiaryEntry"("schoolId", "classroomId", "subjectId", "teacherId", "date");

-- CreateIndex
CREATE INDEX "ClassDiaryEntry_schoolId_classroomId_subjectId_date_idx" ON "ClassDiaryEntry"("schoolId", "classroomId", "subjectId", "date");

-- CreateIndex
CREATE INDEX "ClassDiaryEntry_schoolId_teacherId_date_idx" ON "ClassDiaryEntry"("schoolId", "teacherId", "date");

-- AddForeignKey
ALTER TABLE "ClassDiaryEntry" ADD CONSTRAINT "ClassDiaryEntry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassDiaryEntry" ADD CONSTRAINT "ClassDiaryEntry_classroomId_fkey" FOREIGN KEY ("classroomId") REFERENCES "Classroom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassDiaryEntry" ADD CONSTRAINT "ClassDiaryEntry_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassDiaryEntry" ADD CONSTRAINT "ClassDiaryEntry_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
