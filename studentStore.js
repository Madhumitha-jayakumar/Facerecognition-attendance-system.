import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStudentStore = create(
    persist(
        (set) => ({
            students: [],
            attendanceLogs: [],
            addStudent: (student) => set((state) => ({
                students: [
                    {
                        ...student,
                        attendance: 0,
                        status: 'Active',
                        email: student.email || `${student.name.toLowerCase().replace(' ', '.')}@college.edu`
                    },
                    ...state.students
                ]
            })),
            deleteStudent: (id) => set((state) => ({
                students: state.students.filter(s => s.id !== id),
                attendanceLogs: state.attendanceLogs.filter(log => log.studentId !== id)
            })),
            markAttendance: (logEntry) => set((state) => {
                // Check if already exists for this date + subject + student
                const exists = state.attendanceLogs.some(
                    l => l.studentId === logEntry.studentId &&
                        l.date === logEntry.date &&
                        l.subject === logEntry.subject
                );
                if (exists) return state;
                return { attendanceLogs: [...state.attendanceLogs, logEntry] };
            }),
            unmarkAttendance: (studentId, date, subject) => set((state) => ({
                attendanceLogs: state.attendanceLogs.filter(
                    l => !(l.studentId === studentId && l.date === date && l.subject === subject)
                )
            })),
        }),
        {
            name: 'student-storage',
        }
    )
);

export default useStudentStore;
