import { Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import DashboardOverview from '../features/dashboard/DashboardOverview';
import StudentList from '../features/students/StudentList';
import AddStudent from '../features/students/AddStudent';
import StudentProfile from '../features/students/StudentProfile';
import TakeAttendance from '../features/attendance/TakeAttendance';
import AttendanceRecords from '../features/attendance/AttendanceRecords';

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<DashboardLayout />}>
                <Route index element={<DashboardOverview />} />
                <Route path="students" element={<StudentList />} />
                <Route path="students/add" element={<AddStudent />} />
                <Route path="students/:id" element={<StudentProfile />} />
                <Route path="attendance" element={<TakeAttendance />} />
                <Route path="records" element={<AttendanceRecords />} />
            </Route>

            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;
