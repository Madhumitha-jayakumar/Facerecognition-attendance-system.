import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Search,
    Calendar,
    ChevronRight,
    Download,
    Filter,
    Clock,
    RefreshCw
} from 'lucide-react';

import useStudentStore from '../../store/studentStore';

const AttendanceRecords = () => {
    const { students = [], attendanceLogs = [] } = useStudentStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [isDownloading, setIsDownloading] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);

    const hasData = students.length > 0 && attendanceLogs.length > 0;
    const subjects = Array.from(new Set(attendanceLogs.map((log) => log.subject)));

    const sessions = attendanceLogs.reduce((acc, log) => {
        const key = `${log.date}-${log.subject}`;
        if (!acc[key]) {
            acc[key] = {
                id: key,
                date: log.date,
                subject: log.subject,
                time: log.time,
                present: 0,
                absent: 0,
                students: []
            };
        }
        acc[key].present += 1;
        acc[key].students.push(log.studentId);
        return acc;
    }, {});

    const sessionList = Object.values(sessions)
        .map((session) => ({
            ...session,
            absent: Math.max(students.length - session.present, 0)
        }))
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    const filteredSessions = sessionList.filter((session) => {
        const bySubject = !searchTerm || session.subject.toLowerCase().includes(searchTerm.toLowerCase());
        const byDate = !selectedDate || session.date === selectedDate;
        const byStudent = !selectedStudent || session.students.includes(selectedStudent.id);
        return bySubject && byDate && byStudent;
    });

    const studentAttendanceLogs = selectedStudent
        ? attendanceLogs
              .filter((log) => log.studentId === selectedStudent.id)
              .filter((log) => !selectedDate || log.date === selectedDate)
              .filter((log) => !searchTerm || log.subject.toLowerCase().includes(searchTerm.toLowerCase()))
              .sort((a, b) => new Date(`${b.date} ${b.time || '00:00:00'}`) - new Date(`${a.date} ${a.time || '00:00:00'}`))
        : [];

    const handleDownloadReport = () => {
        setIsDownloading(true);

        setTimeout(() => {
            let filteredLogs = attendanceLogs;

            if (selectedDate) {
                filteredLogs = filteredLogs.filter((log) => log.date === selectedDate);
            }
            if (searchTerm) {
                filteredLogs = filteredLogs.filter((log) =>
                    log.subject.toLowerCase().includes(searchTerm.toLowerCase())
                );
            }
            if (selectedStudent) {
                filteredLogs = filteredLogs.filter((log) => log.studentId === selectedStudent.id);
            }

            if (filteredLogs.length === 0) {
                alert('No attendance records found to export for the selected filters.');
                setIsDownloading(false);
                return;
            }

            const logsBySubject = filteredLogs.reduce((acc, log) => {
                if (!acc[log.subject]) acc[log.subject] = [];
                acc[log.subject].push(log);
                return acc;
            }, {});

            const headers = ['Date', 'Time', 'Subject', 'Student ID', 'Name', 'Accuracy', 'Method'];
            let csvContent = 'data:text/csv;charset=utf-8,';
            csvContent += 'DETAILED ATTENDANCE REPORT - MCA 2nd YEAR\n';
            csvContent += `Generated on: ${new Date().toLocaleString()}\n\n`;

            Object.entries(logsBySubject).forEach(([subject, logs]) => {
                csvContent += `Subject: ${subject}\n`;
                csvContent += `${headers.join(',')}\n`;
                csvContent += `${logs
                    .map((log) => {
                        const student = students.find((s) => s.id === log.studentId);
                        let excelTime = log.time || '';
                        if (excelTime && /^\d{1,2}:\d{2}$/.test(excelTime)) {
                            excelTime = `${excelTime}:00`;
                        }
                        return `"${[
                            log.date,
                            excelTime,
                            log.subject,
                            log.studentId,
                            student?.name || 'Unknown',
                            `${log.confidence}%`,
                            log.method
                        ].join('","')}"`;
                    })
                    .join('\n')}\n\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement('a');
            link.setAttribute('href', encodedUri);
            link.setAttribute(
                'download',
                `MCA_Attendance_Full_Report_${selectedDate || new Date().toISOString().split('T')[0]}.csv`
            );
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setIsDownloading(false);
        }, 1000);
    };

    if (!hasData) {
        return (
            <div className="flex flex-col items-center justify-center h-full py-32">
                <h2 className="text-2xl font-bold text-slate-400 mb-4">No attendance records found</h2>
                <p className="text-slate-500">Please add students and attendance logs to view reports.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Attendance Log</h1>
                    <p className="text-slate-400">Review historical data and class reports.</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <button
                        onClick={handleDownloadReport}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-500 transition-all text-xs font-bold shadow-lg shadow-primary-600/20 active:scale-95 disabled:opacity-50"
                    >
                        {isDownloading ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        <span>{isDownloading ? 'Generating Report...' : 'Download Term Report'}</span>
                    </button>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                        Available for: Semester Jan-Jun 2026
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 rounded-2xl">
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Filter size={12} /> Filters
                        </h3>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Select Class</label>
                                <div className="relative group">
                                    <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs outline-none text-white focus:border-primary-500 transition-all appearance-none cursor-pointer"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    >
                                        <option value="">All Classes</option>
                                        {subjects.map((subject) => (
                                            <option key={subject} value={subject}>
                                                {subject}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Date</label>
                                <div className="relative">
                                    <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="date"
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs outline-none text-white focus:border-primary-500 transition-all"
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] text-slate-500 font-bold uppercase">Search Student</label>
                                <div className="relative group">
                                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                    <input
                                        type="text"
                                        placeholder="Search by student name or ID..."
                                        className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-xs outline-none text-white focus:border-primary-500 transition-all"
                                        value={studentSearch}
                                        onChange={(e) => {
                                            setStudentSearch(e.target.value);
                                            setSelectedStudent(null);
                                        }}
                                    />
                                    {studentSearch && (
                                        <div className="absolute left-0 right-0 top-10 bg-slate-800 border border-slate-700 rounded-xl z-10 max-h-40 overflow-y-auto">
                                            {students
                                                .filter(
                                                    (s) =>
                                                        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                        s.id.toLowerCase().includes(studentSearch.toLowerCase())
                                                )
                                                .map((s) => (
                                                    <div
                                                        key={s.id}
                                                        className="px-4 py-2 text-xs text-white hover:bg-primary-600 cursor-pointer"
                                                        onClick={() => {
                                                            setSelectedStudent(s);
                                                            setStudentSearch(s.name);
                                                        }}
                                                    >
                                                        {s.name} ({s.id})
                                                    </div>
                                                ))}
                                            {students.filter(
                                                (s) =>
                                                    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                    s.id.toLowerCase().includes(studentSearch.toLowerCase())
                                            ).length === 0 && (
                                                <div className="px-4 py-2 text-xs text-slate-400">No students found</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {selectedStudent && (
                                    <div className="mt-2 text-xs text-green-400 font-bold">
                                        Selected: {selectedStudent.name} ({selectedStudent.id})
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 space-y-4">
                    {selectedStudent && (
                        <div className="glass-card p-5 rounded-2xl mb-4">
                            <h2 className="text-lg font-bold text-primary-400 mb-2">
                                Attendance Report for {selectedStudent.name} ({selectedStudent.id})
                            </h2>
                            {studentAttendanceLogs.length === 0 ? (
                                <p className="text-slate-400">No attendance records found for this student.</p>
                            ) : (
                                <table className="w-full text-xs text-white border border-slate-700 rounded-xl overflow-hidden">
                                    <thead>
                                        <tr className="bg-slate-800">
                                            <th className="p-2">Date</th>
                                            <th className="p-2">Subject</th>
                                            <th className="p-2">Time</th>
                                            <th className="p-2">Accuracy</th>
                                            <th className="p-2">Method</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {studentAttendanceLogs.map((log, idx) => (
                                            <tr key={idx} className="border-t border-slate-700">
                                                <td className="p-2">{log.date}</td>
                                                <td className="p-2">{log.subject}</td>
                                                <td className="p-2">{log.time}</td>
                                                <td className="p-2">{log.confidence}%</td>
                                                <td className="p-2">{log.method}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                    {filteredSessions.map((session, index) => (
                        <motion.div
                            key={session.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="glass-card p-5 rounded-2xl hover:border-primary-500/30 transition-all cursor-pointer group"
                        >
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex flex-col items-center justify-center border border-slate-700">
                                        <span className="text-[10px] font-bold text-slate-500 leading-none">
                                            {new Date(session.date).toLocaleString('default', { month: 'short' }).toUpperCase()}
                                        </span>
                                        <span className="text-lg font-bold text-white leading-tight">{session.date.split('-')[2]}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white group-hover:text-primary-400 transition-colors uppercase">
                                            {session.subject}
                                        </h3>
                                        <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 font-medium">
                                            <span className="flex items-center gap-1">
                                                <Clock size={10} /> {session.time}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-6">
                                    <div className="flex gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Present</p>
                                            <p className="text-lg font-bold text-green-400">{session.present}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Absent</p>
                                            <p className="text-lg font-bold text-red-400">{session.absent}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 h-full pl-6 border-l border-slate-800">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                alert(
                                                    `Detailed list for ${session.subject} on ${session.date}:\n\n${session.students
                                                        .map((id) => students.find((s) => s.id === id)?.name || id)
                                                        .join(', ')}`
                                                );
                                            }}
                                            className="p-2 rounded-lg bg-slate-800 text-slate-500 hover:text-white transition-all"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AttendanceRecords;
