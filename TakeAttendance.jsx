import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Camera,
    StopCircle,
    CheckCircle2,
    UserCheck,
    RefreshCw,
    VideoOff,
    User,
    AlertCircle,
    X,
    PlusCircle,
    RotateCcw
} from 'lucide-react';
import useStudentStore from '../../store/studentStore';
import * as faceapi from 'face-api.js';

const MODEL_URL = '/models';

const TakeAttendance = () => {
    const { students, attendanceLogs, markAttendance, unmarkAttendance } = useStudentStore();
    const [isSessionActive, setIsSessionActive] = useState(false);
    const [detectedStudents, setDetectedStudents] = useState([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('Computer Networks');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [loadError, setLoadError] = useState(null);
    const [faceMatcher, setFaceMatcher] = useState(null);
    const [activeDetections, setActiveDetections] = useState([]);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);

    const subjects = [
        'IOT', 'BLOCKCHAIN', 'BIGDATA', 'ML', 'ML LAB', 'IOT LAB', 'COMPUTER NETWORKS', 'OQCC'
    ];

    // Hardcoded for MCA/Computer Science department as requested
    const csStudents = students.filter(s =>
        s.dept.includes('Computer Science') ||
        s.dept === 'MCA' ||
        s.dept === 'CS'
    );

    // Load models and initialize FaceMatcher
    useEffect(() => {
        const loadModels = async () => {
            try {
                setLoadError(null);
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                // Initialize FaceMatcher with students who have descriptors
                const labeledDescriptors = csStudents
                    .filter(s => s.faceDescriptor)
                    .map(s => new faceapi.LabeledFaceDescriptors(s.id, [new Float32Array(s.faceDescriptor)]));

                if (labeledDescriptors.length > 0) {
                    setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6));
                }
                setModelsLoaded(true);
            } catch (err) {
                console.error("Attendance model loading failed:", err);
                setLoadError("Failed to load AI models. Please ensure models are in /public/models.");
            }
        };
        loadModels();
    }, [csStudents.length]);

    // Effect to start camera when session becomes active
    useEffect(() => {
        let isCancelled = false;

        const startCamera = async () => {
            if (!isSessionActive) return;

            // Small delay to ensure the video element is fully mounted in the DOM
            await new Promise(resolve => setTimeout(resolve, 300));
            if (isCancelled || !videoRef.current) return;

            // Check if context is secure
            if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                alert("Camera access is blocked by your browser because this site is not using HTTPS. Please use localhost or an HTTPS connection.");
                setIsSessionActive(false);
                return;
            }

            try {
                const constraints = {
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                if (isCancelled) {
                    stream.getTracks().forEach(t => t.stop());
                    return;
                }

                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    // Force play in case autoPlay is blocked or fails
                    await videoRef.current.play().catch(e => console.warn("Video play failed:", e));
                }
            } catch (err) {
                console.error("Camera access error:", err);
                alert(`Cannot access camera: ${err.message}. Please check if another app is using it and that you have allowed permissions.`);
                setIsSessionActive(false);
            }
        };

        if (isSessionActive) {
            startCamera();
        } else {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }

        return () => {
            isCancelled = true;
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [isSessionActive]);

    const toggleSession = () => {
        setIsSessionActive(!isSessionActive);
    };

    // Load existing attendance for selected subject on mount or subject change
    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        const existingLogs = attendanceLogs.filter(
            log => log.date === today && log.subject === selectedSubject
        );

        const markedStudents = existingLogs.map(log => {
            const student = csStudents.find(s => s.id === log.studentId);
            return {
                ...student,
                time: log.time,
                confidence: log.confidence,
                method: log.method
            };
        }).filter(s => s.id); // Ensure student still exists

        setDetectedStudents(markedStudents);
    }, [selectedSubject, attendanceLogs.length]);

    // Continuous Detection Loop
    useEffect(() => {
        let isCancelled = false;
        let timeoutId = null;

        const runDetection = async () => {
            if (isCancelled || !isSessionActive || !videoRef.current || !modelsLoaded || !faceMatcher) {
                return;
            }

            try {
                const detections = await faceapi
                    .detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                if (detections.length > 0) {
                    const currentDetections = detections.map(d => {
                        const bestMatch = faceMatcher.findBestMatch(d.descriptor);
                        const box = d.detection.box;

                        // Handle auto-marking (Stricter threshold for better accuracy)
                        if (bestMatch.label !== 'unknown' && bestMatch.distance < 0.45) {
                            const studentId = bestMatch.label;
                            if (!detectedStudents.some(ds => ds.id === studentId)) {
                                const student = csStudents.find(s => s.id === studentId);
                                if (student) {
                                    const logEntry = {
                                        studentId: student.id,
                                        date: new Date().toISOString().split('T')[0],
                                        subject: selectedSubject,
                                        time: new Date().toLocaleTimeString(),
                                        confidence: ((1 - bestMatch.distance) * 100).toFixed(1),
                                        method: 'Auto'
                                    };
                                    markAttendance(logEntry);
                                }
                            }
                        }

                        return {
                            label: bestMatch.label === 'unknown' ? 'Unknown' : csStudents.find(s => s.id === bestMatch.label)?.name || bestMatch.label,
                            box: { x: box.x, y: box.y, width: box.width, height: box.height },
                            isMatch: bestMatch.label !== 'unknown'
                        };
                    });
                    setActiveDetections(currentDetections);
                } else {
                    setActiveDetections([]);
                }
            } catch (err) {
                console.error("Loop recognition error:", err);
            }

            // Schedule next check
            if (!isCancelled && isSessionActive) {
                timeoutId = setTimeout(runDetection, 1000); // Check every second
            }
        };

        if (isSessionActive && modelsLoaded && faceMatcher) {
            runDetection();
        }

        return () => {
            isCancelled = true;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [isSessionActive, modelsLoaded, faceMatcher, csStudents]);

    const markAttendanceOneByOne = async () => {
        if (!isSessionActive || !videoRef.current || !modelsLoaded) return;

        setIsProcessing(true);

        try {
            // Detect face in current video frame
            const detection = await faceapi
                .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                alert("No face detected! Please ensure you are facing the camera.");
                setIsProcessing(false);
                return;
            }

            if (!faceMatcher) {
                alert("No trained students found in the system. Please register students with face scans first.");
                setIsProcessing(false);
                return;
            }

            // Match against trained descriptors
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

            if (bestMatch.label === 'unknown' || bestMatch.distance > 0.55) {
                alert("Unknown Face! This person is not registered in the MCA Department.");
            } else {
                const studentId = bestMatch.label;
                const student = csStudents.find(s => s.id === studentId);

                // Check if already marked in this session
                if (detectedStudents.some(ds => ds.id === studentId)) {
                    alert(`${student?.name || studentId} has already been marked present!`);
                } else if (student) {
                    const logEntry = {
                        studentId: student.id,
                        date: new Date().toISOString().split('T')[0],
                        subject: selectedSubject,
                        time: new Date().toLocaleTimeString(),
                        confidence: ((1 - bestMatch.distance) * 100).toFixed(1),
                        method: 'One-by-One'
                    };
                    markAttendance(logEntry);
                }
            }
        } catch (err) {
            console.error("Recognition error:", err);
            alert("Face recognition failed. Please check lighting.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleManualMark = (student) => {
        if (detectedStudents.some(ds => ds.id === student.id)) return;
        const logEntry = {
            studentId: student.id,
            date: new Date().toISOString().split('T')[0],
            subject: selectedSubject,
            time: new Date().toLocaleTimeString(),
            confidence: '100',
            method: 'Manual'
        };
        markAttendance(logEntry);
    };

    const handleUnmark = (studentId) => {
        const today = new Date().toISOString().split('T')[0];
        unmarkAttendance(studentId, today, selectedSubject);
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">MCA Attendance Portal</h1>
                    <p className="text-slate-500 font-medium">Department: Computer Science (Batch 2026)</p>
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Subject</label>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            disabled={isSessionActive}
                            className="bg-slate-900 border border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold outline-none text-white focus:border-primary-500 appearance-none cursor-pointer disabled:opacity-50 transition-all font-sans"
                        >
                            {subjects.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                        </select>
                    </div>

                    <button
                        onClick={toggleSession}
                        className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all shadow-xl active:scale-95 self-end ${isSessionActive
                            ? 'bg-red-500 text-white hover:bg-red-600'
                            : 'bg-primary-600 text-white hover:bg-primary-500'
                            }`}
                    >
                        {isSessionActive ? <StopCircle size={20} /> : <Camera size={20} />}
                        <span>{isSessionActive ? 'Stop Session' : 'Start Session'}</span>
                    </button>
                </div>
            </div>

            {isSessionActive && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary-600/10 border border-primary-500/20 p-4 rounded-2xl flex items-center justify-between"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-primary-500 animate-pulse"></div>
                        <p className="text-sm font-bold text-primary-400">
                            Taking Attendance for: <span className="text-white uppercase tracking-wider">{selectedSubject}</span>
                            {!modelsLoaded && !loadError && <span className="ml-4 text-slate-500 animate-pulse">(Loading AI Models...)</span>}
                            {loadError && <span className="ml-4 text-red-500 font-bold flex items-center gap-1"><AlertCircle size={14} /> {loadError}</span>}
                        </p>
                    </div>
                </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Camera Feed */}
                <div className="space-y-6">
                    <div className="relative aspect-video bg-[#020617] rounded-[32px] overflow-hidden border-2 border-slate-800 shadow-2xl flex items-center justify-center">
                        {!isSessionActive ? (
                            <div className="flex flex-col items-center gap-4 text-slate-700">
                                <VideoOff size={64} strokeWidth={1} />
                                <p className="font-bold uppercase tracking-widest text-[10px]">Camera System Offline</p>
                            </div>
                        ) : (
                            <div className="relative w-full h-full">
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />

                                {/* Real-time Recognition Overlays */}
                                <div className="absolute inset-0 pointer-events-none">
                                    {activeDetections.map((det, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                position: 'absolute',
                                                left: `${(det.box.x / (videoRef.current?.videoWidth || 640)) * 100}%`,
                                                top: `${(det.box.y / (videoRef.current?.videoHeight || 480)) * 100}%`,
                                                width: `${(det.box.width / (videoRef.current?.videoWidth || 640)) * 100}%`,
                                                height: `${(det.box.height / (videoRef.current?.videoHeight || 480)) * 100}%`,
                                                border: det.isMatch ? '2px solid #22c55e' : '2px solid #ef4444',
                                                borderRadius: '8px',
                                                boxShadow: det.isMatch ? '0 0 10px rgba(34,197,94,0.5)' : '0 0 10px rgba(239,68,68,0.5)',
                                                transition: 'all 0.1s linear'
                                            }}
                                        >
                                            <div className={`absolute -top-7 left-0 px-2 py-0.5 rounded text-[9px] font-bold text-white whitespace-nowrap ${det.isMatch ? 'bg-green-500' : 'bg-red-500'}`}>
                                                {det.label}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Scanner Line Animation */}
                                <div className="absolute inset-x-10 top-1/2 -translate-y-1/2 h-0.5 bg-primary-500 shadow-[0_0_20px_rgba(59,130,246,1)] animate-pulse z-10"></div>

                                {isProcessing && (
                                    <div className="absolute inset-0 z-20 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <RefreshCw size={48} className="text-primary-400 animate-spin" />
                                            <p className="text-white font-bold uppercase tracking-widest text-[10px]">Processing Face...</p>
                                        </div>
                                    </div>
                                )}

                                <div className="absolute top-6 left-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-[10px] text-white font-bold uppercase tracking-wider">Live Recognition</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={markAttendanceOneByOne}
                        disabled={!isSessionActive || isProcessing || !modelsLoaded}
                        className="w-full py-5 rounded-[24px] bg-white text-slate-950 font-black text-lg shadow-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group"
                    >
                        {isProcessing || !modelsLoaded ? <RefreshCw size={24} className="animate-spin" /> : <UserCheck size={24} className="group-active:scale-125 transition-transform" />}
                        {!modelsLoaded ? 'Initializing AI...' : isProcessing ? 'Processing Face...' : 'Mark Attendance (One-by-One)'}
                    </button>

                    {/* Manual Roster Selection */}
                    {isSessionActive && (
                        <div className="glass-card rounded-[32px] p-6 border border-slate-800/50">
                            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                                <PlusCircle size={16} className="text-primary-400" /> Manual Override
                            </h3>
                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                                {csStudents.filter(s => !detectedStudents.some(ds => ds.id === s.id)).length === 0 ? (
                                    <p className="text-[10px] text-slate-500 font-bold uppercase text-center py-4 italic">Entire roster marked present</p>
                                ) : (
                                    csStudents
                                        .filter(s => !detectedStudents.some(ds => ds.id === s.id))
                                        .map(student => (
                                            <div key={student.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors">
                                                <div>
                                                    <p className="text-xs font-bold text-white uppercase tracking-tight">{student.name}</p>
                                                    <p className="text-[8px] text-slate-500 font-bold uppercase">{student.id}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleManualMark(student)}
                                                    className="px-4 py-1.5 rounded-lg bg-primary-600/10 text-primary-400 text-[9px] font-black uppercase hover:bg-primary-600 hover:text-white transition-all active:scale-95"
                                                >
                                                    Mark
                                                </button>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Attendance Record Card */}
                <div className="glass-card rounded-[32px] p-8 flex flex-col h-[550px] border border-slate-800/50 shadow-2xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-white tracking-tight">Current Class Roster</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 tracking-widest">
                                Computer Science Dept • {detectedStudents.length} Marked
                            </p>
                        </div>
                        <div className="p-3 bg-slate-800 rounded-2xl border border-slate-700">
                            <UserCheck size={20} className="text-green-500" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                        <AnimatePresence initial={false}>
                            {detectedStudents.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-4 opacity-50">
                                    <User size={64} strokeWidth={1} />
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-center leading-relaxed">
                                        Start Session & Click<br />MARK ATTENDANCE
                                    </p>
                                </div>
                            ) : (
                                detectedStudents.map((student, idx) => (
                                    <motion.div
                                        key={student.id + idx}
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center justify-between p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 group"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary-600/10 flex items-center justify-center border border-primary-500/20 group-hover:border-primary-500/50 transition-colors">
                                                <User className="text-primary-400" size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-white text-sm uppercase tracking-wide">{student.name}</h4>
                                                <p className="text-[9px] text-slate-500 font-bold tracking-tighter uppercase">{student.id} • {student.time}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest flex items-center gap-1">
                                                    <CheckCircle2 size={10} /> Present
                                                </span>
                                                <button
                                                    onClick={() => handleUnmark(student.id)}
                                                    className="p-1 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                                    title="Unmark / Correct"
                                                >
                                                    <X size={10} />
                                                </button>
                                            </div>
                                            <span className="text-[9px] text-slate-600 font-bold">Accuracy: {student.confidence}% ({student.method})</span>
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TakeAttendance;
