import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import './Login.css';

// Hook personnalisé pour la validation en temps réel
const useValidation = () => {
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) return 'Email requis';
        if (!emailRegex.test(email)) return 'Format email invalide';
        return '';
    };

    const validatePassword = (password) => {
        if (!password) return 'Mot de passe requis';
        if (password.length < 6) return 'Au moins 6 caractères requis';
        return '';
    };

    const validate = (field, value) => {
        let error = '';
        switch (field) {
            case 'email':
                error = validateEmail(value);
                break;
            case 'password':
                error = validatePassword(value);
                break;
            default:
                break;
        }
        
        setErrors(prev => ({ ...prev, [field]: error }));
        return error === '';
    };

    const touch = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const isFieldValid = (field) => !errors[field] && touched[field];
    const isFieldInvalid = (field) => errors[field] && touched[field];

    return { errors, touched, validate, touch, isFieldValid, isFieldInvalid };
};

// Hook pour les animations
const useFormAnimation = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        setIsVisible(true);
        const timer = setTimeout(() => setCurrentStep(1), 300);
        return () => clearTimeout(timer);
    }, []);

    return { isVisible, currentStep };
};

// Composant pour l'indicateur de force du mot de passe
const PasswordStrengthIndicator = ({ password, isVisible }) => {
    const getStrength = (pass) => {
        if (!pass) return { score: 0, label: '', color: '#ddd' };
        
        let score = 0;
        if (pass.length >= 6) score += 1;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        const levels = [
            { label: 'Très faible', color: '#f44336' },
            { label: 'Faible', color: '#ff9800' },
            { label: 'Moyen', color: '#ffc107' },
            { label: 'Bon', color: '#4caf50' },
            { label: 'Excellent', color: '#2196f3' }
        ];

        return { score, ...levels[Math.min(score - 1, 4)] };
    };

    const strength = getStrength(password);

    if (!isVisible || !password) return null;

    return (
        <div className="password-strength">
            <div className="strength-bars">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className={`strength-bar ${i < strength.score ? 'active' : ''}`}
                        style={{
                            backgroundColor: i < strength.score ? strength.color : '#e0e0e0'
                        }}
                    />
                ))}
            </div>
            <span className="strength-label" style={{ color: strength.color }}>
                {strength.label}
            </span>
        </div>
    );
};

// Composant pour les champs de saisie avancés
const FormInput = ({ 
    type, 
    id, 
    value, 
    onChange, 
    onBlur, 
    placeholder, 
    label, 
    error, 
    isValid, 
    isInvalid, 
    icon,
    showPasswordStrength = false 
}) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const inputType = type === 'password' && showPassword ? 'text' : type;

    return (
        <div className="form-group">
            <label htmlFor={id} className={`form-label ${isFocused || value ? 'floating' : ''}`}>
                {label}
            </label>
            
            <div className={`input-wrapper ${isFocused ? 'focused' : ''} ${isValid ? 'valid' : ''} ${isInvalid ? 'invalid' : ''}`}>
                {icon && <span className="input-icon">{icon}</span>}
                
                <input
                    type={inputType}
                    id={id}
                    value={value}
                    onChange={onChange}
                    onBlur={onBlur}
                    onFocus={() => setIsFocused(true)}
                    onBlur={(e) => {
                        setIsFocused(false);
                        onBlur && onBlur(e);
                    }}
                    placeholder={isFocused ? placeholder : ''}
                    className="form-input"
                    autoComplete={type === 'email' ? 'username' : 'current-password'}
                />
                
                {type === 'password' && (
                    <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Cacher le mot de passe' : 'Afficher le mot de passe'}
                    >
                        {showPassword ? '👁️' : '👁️‍🗨️'}
                    </button>
                )}
                
                {isValid && <span className="validation-icon success">✓</span>}
                {isInvalid && <span className="validation-icon error">✗</span>}
            </div>
            
            {showPasswordStrength && (
                <PasswordStrengthIndicator 
                    password={value} 
                    isVisible={isFocused || value.length > 0} 
                />
            )}
            
            {error && <div className="error-message">{error}</div>}
        </div>
    );
};

// Composant principal Login
const Login = ({ addNotification }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [loginAttempts, setLoginAttempts] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [lockTimeRemaining, setLockTimeRemaining] = useState(0);
    
    const navigate = useNavigate();
    const formRef = useRef();
    const { errors, validate, touch, isFieldValid, isFieldInvalid } = useValidation();
    const { isVisible, currentStep } = useFormAnimation();

    // Vérification de l'utilisateur déjà connecté
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                const isExpired = payload.exp < Date.now() / 1000;
                
                if (!isExpired) {
                    const dashboardPath = payload.role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';
                    navigate(dashboardPath);
                    if (addNotification) {
                        addNotification('Vous êtes déjà connecté !', 'info');
                    }
                } else {
                    localStorage.removeItem('token');
                }
            } catch (e) {
                localStorage.removeItem('token');
            }
        }
    }, [navigate, addNotification]);

    // Gestion du verrouillage temporaire
    useEffect(() => {
        if (isLocked && lockTimeRemaining > 0) {
            const timer = setInterval(() => {
                setLockTimeRemaining(prev => {
                    if (prev <= 1) {
                        setIsLocked(false);
                        setLoginAttempts(0);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            
            return () => clearInterval(timer);
        }
    }, [isLocked, lockTimeRemaining]);

    // Sauvegarde automatique du formulaire
    useEffect(() => {
        if (rememberMe) {
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('savedEmail');
        }
    }, [email, rememberMe]);

    // Chargement de l'email sauvegardé
    useEffect(() => {
        const savedEmail = localStorage.getItem('savedEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleEmailChange = (e) => {
        const value = e.target.value;
        setEmail(value);
        if (value) validate('email', value);
    };

    const handlePasswordChange = (e) => {
        const value = e.target.value;
        setPassword(value);
        if (value) validate('password', value);
    };

    const handleBlur = (field, value) => {
        touch(field);
        validate(field, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isLocked) {
            if (addNotification) {
                addNotification(`Compte temporairement verrouillé. Réessayez dans ${lockTimeRemaining}s`, 'warning');
            }
            return;
        }

        // Validation finale
        const emailValid = validate('email', email);
        const passwordValid = validate('password', password);
        touch('email');
        touch('password');

        if (!emailValid || !passwordValid) {
            if (addNotification) {
                addNotification('Veuillez corriger les erreurs du formulaire', 'error');
            }
            return;
        }

        setIsLoading(true);

        try {
            console.log("Tentative de connexion avec:", email);
            
            const response = await axios.post('http://localhost:5000/api/users/login', {
                email,
                password
            });
            
            console.log("Réponse de connexion:", response.data);

            if (response.data && response.data.token) {
                // Succès - Reset des tentatives
                setLoginAttempts(0);
                
                // Clear any existing data first
                localStorage.clear();
                
                // Store all necessary auth info
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('userRole', response.data.userRole || response.data.user?.role);
                localStorage.setItem('userName', response.data.userName || response.data.user?.name);
                localStorage.setItem('userId', response.data.userId || response.data.user?.id);
                
                // Restaurer les préférences utilisateur
                if (rememberMe) {
                    localStorage.setItem('savedEmail', email);
                }

                if (addNotification) {
                    addNotification(`Connexion réussie ! Bienvenue ${response.data.userName || response.data.user?.name || 'back'} !`, 'success');
                }
                
                console.log("Données d'auth stockées");
                
                const dashboardPath = response.data.userRole === 'teacher' || 
                                     response.data.user?.role === 'teacher' ? 
                                     '/dashboard/teacher' : '/dashboard/student';
                
                // Délai pour voir la notification de succès
                setTimeout(() => {
                    window.location.href = dashboardPath;
                }, 1500);
            } else {
                throw new Error('Réponse du serveur invalide');
            }
        } catch (err) {
            console.error('Erreur de connexion:', err);
            
            // Gestion des tentatives de connexion
            const newAttempts = loginAttempts + 1;
            setLoginAttempts(newAttempts);
            
            if (newAttempts >= 5) {
                setIsLocked(true);
                setLockTimeRemaining(300); // 5 minutes
                if (addNotification) {
                    addNotification('Trop de tentatives échouées. Compte verrouillé pendant 5 minutes.', 'error');
                }
            } else {
                const errorMsg = err.response?.data?.message || 'Connexion échouée. Vérifiez vos identifiants.';
                if (addNotification) {
                    addNotification(`${errorMsg} (Tentative ${newAttempts}/5)`, 'error');
                }
            }
            
            setIsLoading(false);
        }
    };

    const handleForgotPassword = () => {
        setShowForgotPassword(true);
        if (addNotification) {
            addNotification('Fonctionnalité bientôt disponible !', 'info');
        }
    };

    const handleDemoLogin = (userType) => {
        const demoCredentials = {
            teacher: { email: 'teacher@demo.com', password: 'demo123' },
            student: { email: 'student@demo.com', password: 'demo123' }
        };

        const creds = demoCredentials[userType];
        setEmail(creds.email);
        setPassword(creds.password);
        
        if (addNotification) {
            addNotification(`Compte démo ${userType} chargé !`, 'info');
        }
    };

    return (
        <div className={`login-container ${isVisible ? 'animate-in' : ''}`}>
            <div className="background-elements">
                <div className="floating-shape shape-1"></div>
                <div className="floating-shape shape-2"></div>
                <div className="floating-shape shape-3"></div>
            </div>

            <div className={`login-card ${currentStep >= 1 ? 'slide-in' : ''}`}>
                {/* Header */}
                <div className="login-header">
                    <div className="logo-section">
                        <div className="logo">🧮</div>
                        <h1>Mathemann</h1>
                    </div>
                    <h2>Connexion</h2>
                    <p className="subtitle">Accédez à votre espace d'apprentissage personnalisé</p>
                </div>

                {/* Barre de progression de sécurité */}
                {loginAttempts > 0 && (
                    <div className="security-warning">
                        <div className="attempts-indicator">
                            <span className="warning-icon">⚠️</span>
                            <span>Tentatives: {loginAttempts}/5</span>
                            {isLocked && (
                                <span className="lock-timer">
                                    🔒 Verrouillé pour {Math.floor(lockTimeRemaining / 60)}:{(lockTimeRemaining % 60).toString().padStart(2, '0')}
                                </span>
                            )}
                        </div>
                        <div className="attempts-bar">
                            <div 
                                className="attempts-fill"
                                style={{ width: `${(loginAttempts / 5) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Formulaire */}
                <form ref={formRef} onSubmit={handleSubmit} className="login-form">
                    <FormInput
                        type="email"
                        id="email"
                        value={email}
                        onChange={handleEmailChange}
                        onBlur={() => handleBlur('email', email)}
                        placeholder="votre@email.com"
                        label="Adresse email"
                        error={errors.email}
                        isValid={isFieldValid('email')}
                        isInvalid={isFieldInvalid('email')}
                        icon="📧"
                    />

                    <FormInput
                        type="password"
                        id="password"
                        value={password}
                        onChange={handlePasswordChange}
                        onBlur={() => handleBlur('password', password)}
                        placeholder="Votre mot de passe"
                        label="Mot de passe"
                        error={errors.password}
                        isValid={isFieldValid('password')}
                        isInvalid={isFieldInvalid('password')}
                        icon="🔒"
                        showPasswordStrength={false}
                    />

                    {/* Options */}
                    <div className="form-options">
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-label">Se souvenir de moi</span>
                        </label>

                        <button
                            type="button"
                            className="forgot-password-link"
                            onClick={handleForgotPassword}
                        >
                            Mot de passe oublié ?
                        </button>
                    </div>

                    {/* Bouton de connexion */}
                    <button 
                        type="submit" 
                        className={`login-button ${isLoading ? 'loading' : ''} ${isLocked ? 'locked' : ''}`}
                        disabled={isLoading || isLocked}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                <span>Connexion en cours...</span>
                            </>
                        ) : isLocked ? (
                            <>
                                <span>🔒</span>
                                <span>Compte verrouillé</span>
                            </>
                        ) : (
                            <>
                                <span>Se connecter</span>
                                <span className="arrow">→</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Comptes de démonstration */}
                <div className="demo-section">
                    <h3>Comptes de démonstration</h3>
                    <div className="demo-buttons">
                        <button 
                            type="button"
                            className="demo-button teacher"
                            onClick={() => handleDemoLogin('teacher')}
                            disabled={isLoading}
                        >
                            <span className="demo-icon">👨‍🏫</span>
                            <div>
                                <div className="demo-role">Professeur</div>
                                <div className="demo-description">Interface d'enseignement</div>
                            </div>
                        </button>

                        <button 
                            type="button"
                            className="demo-button student"
                            onClick={() => handleDemoLogin('student')}
                            disabled={isLoading}
                        >
                            <span className="demo-icon">👨‍🎓</span>
                            <div>
                                <div className="demo-role">Étudiant</div>
                                <div className="demo-description">Interface d'apprentissage</div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="login-footer">
                    <p>Pas encore de compte ?</p>
                    <Link 
                        to="/register" 
                        className="signup-link"
                        onClick={(e) => {
                            e.preventDefault();
                            navigate('/register');
                        }}
                    >
                        Créer un compte gratuit
                        <span className="arrow-icon">→</span>
                    </Link>
                    
                    <div className="help-links">
                        <a 
                            href="#" 
                            className="help-link"
                            onClick={(e) => {
                                e.preventDefault();
                                window.location.href = "mailto:contact@mathemann.fr";
                            }}
                        >
                            <span className="help-icon">📧</span>
                            <span>Support technique</span>
                        </a>
                        <Link 
                            to="/aide" 
                            className="help-link"
                            onClick={(e) => {
                                e.preventDefault();
                                navigate('/aide');
                            }}
                        >
                            <span className="help-icon">❓</span>
                            <span>Centre d'aide</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Indicateurs de confiance */}
            <div className="trust-indicators">
                <div className="trust-item">
                    <span className="trust-icon">🔐</span>
                    <span>Connexion sécurisée SSL</span>
                </div>
                <div className="trust-item">
                    <span className="trust-icon">🛡️</span>
                    <span>Données protégées RGPD</span>
                </div>
                <div className="trust-item">
                    <span className="trust-icon">⚡</span>
                    <span>Accès instantané</span>
                </div>
            </div>
        </div>
    );
};

export default Login;