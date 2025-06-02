import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavBar from './components/NavBar';
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Learning from "./pages/Learning";
import StudentDashboard from "./components/StudentDashboard";
import TeacherDashboard from "./components/TeacherDashboard";
import Profile from "./components/Profile/Profile";
import MessagesPage from "./pages/MessagesPage";
import "./styles/App.css";
import MainLayout from "./components/Layout/MainLayout";
import Home from "./pages/Home";
import ChapterView from './components/ChapterView';
import EnhancedChapterView from './components/EnhancedChapterView';
import QuizView from './components/QuizView';

// Nouveau composant pour les notifications toast
const ToastNotification = ({ notifications, removeNotification }) => {
    return (
        <div className="toast-container">
            {notifications.map(notification => (
                <div 
                    key={notification.id} 
                    className={`toast toast-${notification.type}`}
                    onClick={() => removeNotification(notification.id)}
                >
                    <div className="toast-content">
                        <span className="toast-icon">
                            {notification.type === 'success' && '✅'}
                            {notification.type === 'error' && '❌'}
                            {notification.type === 'info' && 'ℹ️'}
                            {notification.type === 'warning' && '⚠️'}
                        </span>
                        <span className="toast-message">{notification.message}</span>
                    </div>
                    <button className="toast-close" onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                    }}>×</button>
                </div>
            ))}
        </div>
    );
};

// Composant de chargement amélioré
const LoadingSpinner = () => (
    <div className="loading-container">
        <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Chargement de votre espace d'apprentissage...</p>
            <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </div>
);

// Hook personnalisé pour les notifications
const useNotifications = () => {
    const [notifications, setNotifications] = useState([]);

    const addNotification = (message, type = 'info', duration = 5000) => {
        const id = Date.now() + Math.random();
        const notification = { id, message, type };
        
        setNotifications(prev => [...prev, notification]);
        
        // Auto-suppression après duration
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, duration);
    };

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return { notifications, addNotification, removeNotification };
};

// Hook personnalisé pour les métriques utilisateur
const useUserMetrics = (isAuthenticated, userRole) => {
    const [metrics, setMetrics] = useState({
        streak: 0,
        totalPoints: 0,
        completedLessons: 0,
        totalLessons: 0,
        badges: [],
        lastActivity: null
    });

    useEffect(() => {
        if (isAuthenticated) {
            loadUserMetrics();
            // Mise à jour périodique des métriques
            const interval = setInterval(loadUserMetrics, 30000); // Toutes les 30 secondes
            return () => clearInterval(interval);
        }
    }, [isAuthenticated]);

    const loadUserMetrics = async () => {
        try {
            const userId = localStorage.getItem('userId');
            if (!userId) return;

            // Simulation d'appel API - remplacez par votre vraie API
            const response = await fetch(`/api/users/${userId}/metrics`);
            if (response.ok) {
                const data = await response.json();
                setMetrics(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des métriques:', error);
        }
    };

    return { metrics, refreshMetrics: loadUserMetrics };
};

const App = () => {
    const [authState, setAuthState] = useState({
        isAuthenticated: false,
        userRole: null,
        userName: null,
        isLoading: true
    });

    // Nouveaux états pour les fonctionnalités interactives
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    
    // Hooks personnalisés
    const { notifications, addNotification, removeNotification } = useNotifications();
    const { metrics, refreshMetrics } = useUserMetrics(authState.isAuthenticated, authState.userRole);

    useEffect(() => {
        console.log("App initializing, checking auth...");
        checkAuthStatus();
        setupEventListeners();
        
        // Appliquer le thème au chargement
        document.documentElement.setAttribute('data-theme', theme);
        
        return () => {
            // Nettoyage des event listeners
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, []);

    // Gestion des événements globaux
    const setupEventListeners = () => {
        // Détection de la connexion internet
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        // Détection de fermeture de page
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        // Détection d'activité utilisateur
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, updateLastActivity);
        });
    };

    const handleOnline = () => {
        setIsOnline(true);
        addNotification('Connexion rétablie', 'success');
    };

    const handleOffline = () => {
        setIsOnline(false);
        addNotification('Connexion perdue - Mode hors ligne activé', 'warning');
    };

    const handleBeforeUnload = (e) => {
        // Sauvegarder les données importantes avant fermeture
        localStorage.setItem('lastActivity', Date.now().toString());
    };

    const updateLastActivity = () => {
        setLastActivity(Date.now());
    };

    // Fonction de changement de thème
    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        addNotification(`Thème ${newTheme === 'dark' ? 'sombre' : 'clair'} activé`, 'info');
    };
    
    const checkAuthStatus = () => {
        try {
            // Check if token exists
            const token = localStorage.getItem('token');
            const userRole = localStorage.getItem('userRole');
            const userName = localStorage.getItem('userName');
            
            console.log("Auth check:", { token: !!token, userRole, userName });
            
            if (!token) {
                console.log("No token, not authenticated");
                setAuthState({
                    isAuthenticated: false,
                    userRole: null,
                    userName: null,
                    isLoading: false
                });
                return;
            }
            
            // Parse token to check expiration
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const payload = JSON.parse(atob(base64));
            
            const isExpired = payload.exp < (Date.now() / 1000);
            
            if (isExpired) {
                console.log("Token expired, clearing auth data");
                localStorage.clear();
                setAuthState({
                    isAuthenticated: false,
                    userRole: null,
                    userName: null,
                    isLoading: false
                });
                addNotification('Session expirée, veuillez vous reconnecter', 'warning');
            } else {
                console.log("Auth valid, setting state with:", userRole, userName);
                setAuthState({
                    isAuthenticated: true,
                    userRole: userRole,
                    userName: userName,
                    isLoading: false
                });
                // Store user details for other components
                localStorage.setItem('userId', payload.id);
                localStorage.setItem('userName', payload.name);
                localStorage.setItem('userRole', payload.role);
                
                // Notification de bienvenue
                setTimeout(() => {
                    addNotification(`Bon retour, ${userName} !`, 'success');
                }, 1000);
            }
        } catch (error) {
            console.error("Token validation error:", error);
            localStorage.clear();
            setAuthState({
                isAuthenticated: false,
                userRole: null,
                userName: null,
                isLoading: false
            });
            addNotification('Erreur d\'authentification', 'error');
        }
    };

    // Composant d'état de connexion
    const ConnectionStatus = () => (
        <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-indicator"></span>
            <span className="status-text">
                {isOnline ? 'En ligne' : 'Hors ligne'}
            </span>
        </div>
    );

    // Show loading state avec spinner amélioré
    if (authState.isLoading) {
        return <LoadingSpinner />;
    }

    return (
        <BrowserRouter>
            <div className="app" data-theme={theme}>
                {/* Barre d'état de connexion */}
                <ConnectionStatus />
                
                {/* Notifications toast */}
                <ToastNotification 
                    notifications={notifications} 
                    removeNotification={removeNotification} 
                />
                
                <MainLayout 
                    isAuthenticated={authState.isAuthenticated}
                    userRole={authState.userRole}
                    userName={authState.userName}
                    theme={theme}
                    toggleTheme={toggleTheme}
                    metrics={metrics}
                    isOnline={isOnline}
                    addNotification={addNotification}
                >
                    <Routes>
                        <Route path="/" element={
                            authState.isAuthenticated ?
                                <Navigate to={
                                    authState.userRole === 'teacher' ? 
                                    '/dashboard/teacher' : 
                                    '/dashboard/student'
                            } /> :
                            <Home addNotification={addNotification} />
                        } />
                        <Route path="/login" element={
                            authState.isAuthenticated ? 
                                <Navigate to={authState.userRole === 'student' ? '/dashboard/student' : '/dashboard/teacher'} /> :
                                <Login addNotification={addNotification} />
                        } />
                        <Route path="/signup" element={
                            authState.isAuthenticated ? 
                                <Navigate to={authState.userRole === 'student' ? '/dashboard/student' : '/dashboard/teacher'} /> :
                                <Signup addNotification={addNotification} />
                        } />
                        <Route path="/chapter/:chapterId" element={
                            <EnhancedChapterView 
                                key="enhanced-view" 
                                addNotification={addNotification}
                                refreshMetrics={refreshMetrics}
                            />
                        } />
                        <Route path="/quiz/:quizId" element={
                            <QuizView 
                                addNotification={addNotification}
                                refreshMetrics={refreshMetrics}
                            />
                        } />
                        <Route path="/learning" element={
                            <Learning 
                                addNotification={addNotification}
                                metrics={metrics}
                            />
                        } />
                        <Route path="/dashboard/student" element={
                            authState.isAuthenticated && authState.userRole === 'student' ? 
                                <StudentDashboard 
                                    addNotification={addNotification}
                                    metrics={metrics}
                                    refreshMetrics={refreshMetrics}
                                /> : 
                                <Navigate to="/login" />
                        } />
                        <Route path="/dashboard/teacher" element={
                            authState.isAuthenticated && authState.userRole === 'teacher' ? 
                                <TeacherDashboard 
                                    addNotification={addNotification}
                                    metrics={metrics}
                                /> : 
                                <Navigate to="/login" />
                        } />
                        <Route path="/profile" element={
                            authState.isAuthenticated ? 
                                <Profile 
                                    addNotification={addNotification}
                                    theme={theme}
                                    toggleTheme={toggleTheme}
                                /> : 
                                <Navigate to="/login" />
                        } />
                        <Route path="/messages" element={
                            authState.isAuthenticated ? 
                                <MessagesPage 
                                    addNotification={addNotification}
                                    isOnline={isOnline}
                                /> : 
                                <Navigate to="/login" />
                        } />
                    </Routes>
                </MainLayout>
            </div>
        </BrowserRouter>
    );
};

export default App;