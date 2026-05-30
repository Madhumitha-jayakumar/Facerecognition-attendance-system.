import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    Users,
    UserPlus,
    Camera,
    Menu,
    X,
    FileClock
} from 'lucide-react';

const DashboardLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();
    const facultyName = 'Faculty';

    const menuItems = [
        { title: 'Dashboard', icon: LayoutDashboard, path: '/' },
        { title: 'Student List', icon: Users, path: '/students' },
        { title: 'Add Student', icon: UserPlus, path: '/students/add' },
        { title: 'Mark Attendance', icon: Camera, path: '/attendance' },
        { title: 'Reports', icon: FileClock, path: '/records' },
    ];

    return (
        <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden font-sans">
            <motion.aside
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 80 }}
                className="glass border-r border-slate-800/40 flex flex-col z-20 shadow-2xl"
            >
                <div className="p-8 flex items-center gap-4 h-24">
                    <div className="w-12 h-12 rounded-[18px] bg-gradient-to-br from-primary-600 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-600/20">
                        <Camera className="text-white w-6 h-6" />
                    </div>
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                className="flex flex-col"
                            >
                                <span className="font-black text-xl tracking-tighter text-white">MCA<span className="text-primary-400"> PORTAL</span></span>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">Attendance System</span>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto no-scrollbar">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 group relative ${isActive
                                    ? 'bg-primary-600 shadow-xl shadow-primary-600/10 text-white'
                                    : 'hover:bg-slate-800/40 text-slate-500 hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
                                <AnimatePresence>
                                    {isSidebarOpen && (
                                        <motion.span
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            className="font-bold text-sm whitespace-nowrap"
                                        >
                                            {item.title}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                                {isActive && isSidebarOpen && (
                                    <motion.div
                                        layoutId="active-nav-indicator"
                                        className="absolute right-4 w-1 h-1 bg-white rounded-full"
                                    />
                                )}
                            </Link>
                        );
                    })}
                </nav>
            </motion.aside>

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-600/5 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

                <header className="h-24 flex items-center justify-between px-10 bg-[#020617]/40 backdrop-blur-xl border-b border-slate-800/40 z-10">
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all shadow-inner"
                    >
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>

                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-4 pl-8 border-l border-slate-800/50">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-black text-white">{facultyName}</p>
                                <p className="text-[10px] text-primary-500 font-black uppercase tracking-widest">MCA Faculty</p>
                            </div>
                            <div className="w-12 h-12 rounded-[18px] bg-slate-800 border border-slate-700 flex items-center justify-center shadow-lg overflow-hidden">
                                <img src={`https://ui-avatars.com/api/?name=${facultyName}&background=020617&color=3b82f6&bold=true`} alt="avatar" />
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-10 bg-[#020617] relative custom-scrollbar">
                    <div className="max-w-7xl mx-auto space-y-10">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
