import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import NavBar from '../NavBar';
import './MainLayout.css';



// Composant pour le bouton de thème
const ThemeToggle = ({ theme, toggleTheme }) => {
    return (
        <button 
            className="theme-toggle" 
            onClick={toggleTheme}
            title={`Basculer vers le thème ${theme === 'light' ? 'sombre' : 'clair'}`}
            aria-label={`Basculer vers le thème ${theme === 'light' ? 'sombre' : 'clair'}`}
        >
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
    );
};

// Composant pour l'indicateur de statut en ligne
const OnlineStatus = ({ isOnline }) => {
    return (
        <div className={`online-indicator ${isOnline ? 'online' : 'offline'}`}>
            <span className="status-dot"></span>
            <span className="status-text">{isOnline ? 'En ligne' : 'Hors ligne'}</span>
        </div>
    );
};

// Composant de navigation publique amélioré
const PublicNav = ({ theme, toggleTheme, isOnline, addNotification }) => {
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLearningClick = (e) => {
        if (!isOnline) {
            e.preventDefault();
            addNotification('Connexion requise pour accéder aux leçons', 'warning');
        }
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="main-nav public-nav">
            <div className="nav-container">
                <div className="nav-brand">
                    <Link to="/" className="brand-link">
                        <span className="brand-icon">🧮</span>
                        <span className="brand-text">Mathemann</span>
                    </Link>
                </div>
                
                <div className={`nav-items ${isMenuOpen ? 'mobile-open' : ''}`}>
                    <Link 
                        to="/learning" 
                        className={`nav-link ${isActive('/learning') ? 'active' : ''}`}
                        onClick={handleLearningClick}
                    >
                        <span className="nav-icon">📚</span>
                        <span>Apprendre</span>
                    </Link>
                    <Link 
                        to="/login" 
                        className={`nav-link ${isActive('/login') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">🔐</span>
                        <span>Connexion</span>
                    </Link>
                    <Link 
                        to="/signup" 
                        className={`nav-link signup-btn ${isActive('/signup') ? 'active' : ''}`}
                    >
                        <span className="nav-icon">✨</span>
                        <span>S'inscrire</span>
                    </Link>
                    
                    <div className="nav-controls">
                        <ThemeToggle theme={theme} toggleTheme={toggleTheme} />
                        <OnlineStatus isOnline={isOnline} />
                    </div>
                </div>

                <button 
                    className="mobile-menu-toggle"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Menu"
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </nav>
    );
};

// Composant pour les notifications de session
const SessionNotifications = ({ isAuthenticated, userName, addNotification }) => {
    const [hasShownWelcome, setHasShownWelcome] = useState(false);

    useEffect(() => {
        if (isAuthenticated && userName && !hasShownWelcome) {
            setTimeout(() => {
                const currentHour = new Date().getHours();
                let greeting = 'Bonsoir';
                if (currentHour < 12) greeting = 'Bonjour';
                else if (currentHour < 18) greeting = 'Bon après-midi';
                
                addNotification(`${greeting} ${userName} ! Prêt à apprendre ?`, 'success');
                setHasShownWelcome(true);
            }, 1500);
        }
    }, [isAuthenticated, userName, hasShownWelcome, addNotification]);

    return null;
};

// Composant pour le breadcrumb
const Breadcrumb = () => {
    const location = useLocation();
    const pathnames = location.pathname.split('/').filter(x => x);

    if (pathnames.length === 0) return null;

    const breadcrumbMap = {
        'dashboard': '🏠 Tableau de bord',
        'student': '👨‍🎓 Étudiant',
        'teacher': '👨‍🏫 Professeur',
        'learning': '📚 Apprentissage',
        'profile': '👤 Profil',
        'messages': '💬 Messages',
        'chapter': '📖 Chapitre',
        'quiz': '🧩 Quiz'
    };

    return (
        <nav className="breadcrumb">
            <Link to="/" className="breadcrumb-item">🏠 Accueil</Link>
            {pathnames.map((name, index) => {
                const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
                const isLast = index === pathnames.length - 1;
                const displayName = breadcrumbMap[name] || name;

                return (
                    <React.Fragment key={name}>
                        <span className="breadcrumb-separator">›</span>
                        {isLast ? (
                            <span className="breadcrumb-item current">{displayName}</span>
                        ) : (
                            <Link to={routeTo} className="breadcrumb-item">{displayName}</Link>
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
};

// Ajout du composant QuickMetrics
const QuickMetrics = ({ metrics, userRole }) => {
    if (!metrics || userRole !== 'student') return null;

    return (
        <div className="quick-metrics">
            <div className="metric-item">
                <span className="metric-label">Leçons complétées</span>
                <span className="metric-value">{metrics.completedLessons || 0}/{metrics.totalLessons || 0}</span>
            </div>
            <div className="metric-item">
                <span className="metric-label">Score moyen</span>
                <span className="metric-value">{metrics.averageScore || 0}%</span>
            </div>
            <div className="metric-item">
                <span className="metric-label">Temps total</span>
                <span className="metric-value">{metrics.totalTime || 0}h</span>
            </div>
        </div>
    );
};

// Composant principal MainLayout
const MainLayout = ({ 
    children, 
    isAuthenticated, 
    userRole, 
    userName, 
    theme, 
    toggleTheme, 
    metrics, 
    isOnline, 
    addNotification 
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLoading, setIsLoading] = useState(false);

    // Debug logging amélioré
    useEffect(() => {
        console.log("MainLayout rendered with enhanced auth state:", { 
            isAuthenticated, 
            userRole, 
            userName,
            theme,
            isOnline,
            metrics 
        });
    }, [isAuthenticated, userRole, userName, theme, isOnline, metrics]);

    // Gestion du chargement entre les pages
    useEffect(() => {
        setIsLoading(true);
        const timer = setTimeout(() => setIsLoading(false), 300);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    // Gestion des raccourcis clavier
    useEffect(() => {
        const handleKeyPress = (e) => {
            // Ctrl + K pour basculer le thème
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                toggleTheme();
                addNotification('Thème basculé !', 'info');
            }
            
            // Ctrl + H pour aller à l'accueil
            if (e.ctrlKey && e.key === 'h') {
                e.preventDefault();
                navigate('/');
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [toggleTheme, navigate, addNotification]);

    return (
        <div className={`main-layout ${isAuthenticated ? 'authenticated' : 'public'} theme-${theme}`}>
            {/* Notifications de session */}
            <SessionNotifications 
                isAuthenticated={isAuthenticated}
                userName={userName}
                addNotification={addNotification}
            />

            {/* Navigation */}
            {isAuthenticated ? (
                <div className="authenticated-header">
                    <NavBar 
                        userName={userName} 
                        userRole={userRole}
                        theme={theme}
                        toggleTheme={toggleTheme}
                        isOnline={isOnline}
                        addNotification={addNotification}
                    />
                    <QuickMetrics metrics={metrics} userRole={userRole} />
                    <Breadcrumb />
                </div>
            ) : (
                <PublicNav 
                    theme={theme} 
                    toggleTheme={toggleTheme}
                    isOnline={isOnline}
                    addNotification={addNotification}
                />
            )}

            {/* Contenu principal avec overlay de chargement */}
            <main className={`main-content ${isLoading ? 'loading' : ''}`}>
                {isLoading && (
                    <div className="page-loading-overlay">
                        <div className="page-spinner"></div>
                    </div>
                )}
                
                <div className="content-wrapper">
                    {children}
                </div>

                {/* Indicateur de performance */}
                {isAuthenticated && userRole === 'student' && (
                    <div className="performance-indicator">
                        <div className="progress-ring">
                            <svg className="progress-ring-svg" width="60" height="60">
                                <circle
                                    className="progress-ring-circle-bg"
                                    stroke="var(--border-color)"
                                    strokeWidth="4"
                                    fill="transparent"
                                    r="26"
                                    cx="30"
                                    cy="30"
                                />
                                <circle
                                    className="progress-ring-circle"
                                    stroke="var(--primary-color)"
                                    strokeWidth="4"
                                    fill="transparent"
                                    r="26"
                                    cx="30"
                                    cy="30"
                                    style={{
                                        strokeDasharray: `${2 * Math.PI * 26}`,
                                        strokeDashoffset: `${2 * Math.PI * 26 * (1 - (metrics?.completedLessons || 0) / (metrics?.totalLessons || 1))}`,
                                    }}
                                />
                            </svg>
                            <div className="progress-text">
                                {Math.round(((metrics?.completedLessons || 0) / (metrics?.totalLessons || 1)) * 100)}%
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Footer amélioré */}
            <footer className="main-footer">
                <div className="footer-content">
                    <div className="footer-section">
                        <h4>🧮 Mathemann</h4>
                        <p>Plateforme d'apprentissage des mathématiques de nouvelle génération</p>
                    </div>
                    
                    <div className="footer-section">
                        <h4>Liens rapides</h4>
                        <Link to="/learning">📚 Cours</Link>
                        {isAuthenticated && <Link to="/profile">👤 Profil</Link>}
                        {isAuthenticated && <Link to="/messages">💬 Messages</Link>}
                    </div>
                    
                    <div className="footer-section">
                        <h4>Support</h4>
                        <p>📧 support@mathemann.com</p>
                        <p>🌐 Status: <span className={isOnline ? 'status-online' : 'status-offline'}>
                            {isOnline ? 'En ligne' : 'Hors ligne'}
                        </span></p>
                    </div>
                </div>
                
                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} Mathemann - Plateforme d'apprentissage professionnel des mathématiques</p>
                    <div className="footer-shortcuts">
                        <span>Raccourcis: Ctrl+K (thème), Ctrl+H (accueil)</span>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default MainLayout;