import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import './NavBar.css';

// Hook personnalisé pour fermer le dropdown
const useClickOutside = (ref, callback) => {
    useEffect(() => {
        const handleClick = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [ref, callback]);
};

// Composant pour l'avatar utilisateur amélioré
const UserAvatar = ({ userName, userRole }) => {
    const getInitials = (name) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'teacher': return 'var(--success-color, #4caf50)';
            case 'student': return 'var(--primary-color, #2196f3)';
            case 'admin': return 'var(--warning-color, #ff9800)';
            default: return 'var(--primary-color, #2196f3)';
        }
    };

    const getRoleIcon = (role) => {
        switch (role) {
            case 'teacher': return '👨‍🏫';
            case 'student': return '👨‍🎓';
            case 'admin': return '👑';
            default: return '👤';
        }
    };

    return (
        <div 
            className="profile-icon" 
            style={{ backgroundColor: getRoleColor(userRole) }}
            title={`${userName} (${userRole})`}
        >
            <span className="avatar-initials">{getInitials(userName)}</span>
            <span className="role-badge">{getRoleIcon(userRole)}</span>
        </div>
    );
};

// Composant pour les notifications
const NotificationBadge = ({ count = 0 }) => {
    if (count === 0) return null;
    
    return (
        <div className="notification-badge">
            {count > 99 ? '99+' : count}
        </div>
    );
};

const NavBar = ({ userName, userRole, theme, toggleTheme, isOnline, addNotification }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [notifications, setNotifications] = useState(2); // Exemple de notifications
    const [isScrolled, setIsScrolled] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    
    const navigate = useNavigate();
    const location = useLocation();
    const dropdownRef = useRef(null);

    // Fermeture automatique du dropdown
    useClickOutside(dropdownRef, () => setShowDropdown(false));

    useEffect(() => {
        console.log("NavBar rendered with enhanced props:", { 
            userName, 
            userRole, 
            theme, 
            isOnline 
        });
    }, [userName, userRole, theme, isOnline]);

    // Gestion du scroll pour effet navbar
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Fermeture du dropdown lors du changement de route
    useEffect(() => {
        setShowDropdown(false);
    }, [location.pathname]);

    // Simulation de mise à jour des notifications
    useEffect(() => {
        const interval = setInterval(() => {
            // Simulation d'arrivée de nouvelles notifications
            if (Math.random() > 0.8) {
                setNotifications(prev => prev + 1);
            }
        }, 30000); // Toutes les 30 secondes

        return () => clearInterval(interval);
    }, []);

    const handleBrandClick = () => {
        const dashboardPath = userRole === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';
        navigate(dashboardPath);
        
        if (addNotification) {
            addNotification(`Retour au tableau de bord ${userRole}`, 'info');
        }
    };

    const handleLogout = () => {
        console.log("Logging out...");
        try {
            // Sauvegarde des préférences utilisateur
            const currentTheme = localStorage.getItem('theme');
            
            // Clear auth data but keep theme
            const keysToRemove = ['token', 'userRole', 'userName', 'userId'];
            keysToRemove.forEach(key => localStorage.removeItem(key));
            sessionStorage.clear();
            
            // Restaurer le thème
            if (currentTheme) {
                localStorage.setItem('theme', currentTheme);
            }
            
            setShowDropdown(false);
            
            if (addNotification) {
                addNotification('Déconnexion réussie. À bientôt !', 'success');
            }
            
            // Redirection après un court délai pour voir la notification
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
            console.log("Logout successful");
        } catch (error) {
            console.error("Logout error:", error);
            if (addNotification) {
                addNotification('Erreur lors de la déconnexion', 'error');
            }
            navigate('/');
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Bonjour';
        if (hour < 18) return 'Bon après-midi';
        return 'Bonsoir';
    };

    const getActivityStatus = () => {
        const timeSinceActivity = Date.now() - lastActivity;
        if (timeSinceActivity < 60000) return 'Actif maintenant';
        if (timeSinceActivity < 300000) return 'Actif récemment';
        return 'Inactif';
    };

    // Navigation items avec badges
    const navItems = [
        {
            path: '/learning',
            label: 'Cours',
            icon: '📚'
        },
        {
            path: '/messages',
            label: 'Messages',
            icon: '💬',
            badge: notifications
        }
    ];

    return (
        <nav className={`navbar ${isScrolled ? 'scrolled' : ''} ${!isOnline ? 'offline' : ''}`}>
            <div className="navbar-container">
                {/* Brand/Logo amélioré */}
                <div className="navbar-brand" onClick={handleBrandClick}>
                    <div className="brand-content">
                        <span className="brand-icon">🧮</span>
                        <h1>Mathemann</h1>
                    </div>
                </div>

                {/* Navigation centrale */}
                <div className="navbar-nav">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                            {item.badge > 0 && <NotificationBadge count={item.badge} />}
                        </Link>
                    ))}
                </div>

                {/* Section de droite */}
                <div className="navbar-actions">
                    {/* Indicateur de connexion */}
                    <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
                        <span className="status-dot"></span>
                        <span className="status-text d-none d-sm-inline">
                            {isOnline ? 'En ligne' : 'Hors ligne'}
                        </span>
                    </div>

                    {/* Bouton de thème */}
                    {toggleTheme && (
                        <button 
                            className="theme-toggle-btn"
                            onClick={() => {
                                toggleTheme();
                                if (addNotification) {
                                    addNotification(`Thème ${theme === 'light' ? 'sombre' : 'clair'} activé`, 'info');
                                }
                            }}
                            title={`Basculer vers le thème ${theme === 'light' ? 'sombre' : 'clair'}`}
                            aria-label="Basculer le thème"
                        >
                            <span className="theme-icon">
                                {theme === 'light' ? '🌙' : '☀️'}
                            </span>
                        </button>
                    )}

                    {/* Profile section améliorée */}
                    <div className="profile-section" ref={dropdownRef}>
                        <div 
                            className={`profile-trigger ${showDropdown ? 'active' : ''}`}
                            onClick={() => setShowDropdown(!showDropdown)}
                            role="button"
                            tabIndex={0}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    setShowDropdown(!showDropdown);
                                }
                            }}
                            aria-expanded={showDropdown}
                            aria-haspopup="true"
                        >
                            <UserAvatar userName={userName} userRole={userRole} />
                            <div className="profile-info d-none d-md-block">
                                <span className="profile-name">{userName}</span>
                                <span className="profile-role">{userRole}</span>
                            </div>
                            <i className={`arrow ${showDropdown ? 'up' : 'down'}`}></i>
                        </div>

                        {showDropdown && (
                            <div className="profile-dropdown">
                                <div className="dropdown-header">
                                    <strong>{getGreeting()}, {userName} !</strong>
                                    <div className="user-details">
                                        <small>Rôle: <span className="role-tag">{userRole}</span></small>
                                        <small className="activity-status">
                                            📍 {getActivityStatus()}
                                        </small>
                                        <small className="connection-status">
                                            🌐 {isOnline ? 'Connecté' : 'Hors ligne'}
                                        </small>
                                    </div>
                                </div>

                                <div className="dropdown-menu-items">
                                    <button onClick={() => {
                                        navigate('/profile');
                                        setShowDropdown(false);
                                    }} className="dropdown-item">
                                        <span className="item-icon">👤</span>
                                        <span>Mon Profil</span>
                                    </button>
                                    
                                    <button onClick={() => {
                                        navigate('/settings');
                                        setShowDropdown(false);
                                    }} className="dropdown-item">
                                        <span className="item-icon">⚙️</span>
                                        <span>Paramètres</span>
                                    </button>

                                    {toggleTheme && (
                                        <button 
                                            className="dropdown-item theme-toggle-item"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleTheme();
                                                if (addNotification) {
                                                    addNotification(`Thème ${theme === 'light' ? 'sombre' : 'clair'} activé`, 'info');
                                                }
                                            }}
                                        >
                                            <span className="item-icon">
                                                {theme === 'light' ? '🌙' : '☀️'}
                                            </span>
                                            <span>Thème {theme === 'light' ? 'sombre' : 'clair'}</span>
                                        </button>
                                    )}

                                    <button onClick={() => {
                                        navigate('/help');
                                        setShowDropdown(false);
                                    }} className="dropdown-item">
                                        <span className="item-icon">❓</span>
                                        <span>Aide</span>
                                    </button>

                                    <div className="dropdown-divider"></div>

                                    <button onClick={handleLogout} className="dropdown-item logout-btn">
                                        <span className="item-icon">🚪</span>
                                        <span>Déconnexion</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Barre d'alerte hors ligne */}
            {!isOnline && (
                <div className="offline-banner">
                    <span className="offline-icon">📡</span>
                    <span>Mode hors ligne - Certaines fonctionnalités peuvent être limitées</span>
                    <button 
                        className="retry-connection"
                        onClick={() => window.location.reload()}
                    >
                        Réessayer
                    </button>
                </div>
            )}
        </nav>
    );
};

export default NavBar;