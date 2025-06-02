import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import './SignUp.css';

// Hook personnalisé pour la validation avancée
const useAdvancedValidation = () => {
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [validFields, setValidFields] = useState({});

    const validateName = (name) => {
        if (!name) return 'Nom requis';
        if (name.length < 2) return 'Au moins 2 caractères requis';
        if (name.length > 50) return 'Maximum 50 caractères';
        if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) return 'Seules les lettres et espaces sont autorisés';
        return '';
    };

    const validateEmail = (email) => {
        if (!email) return 'Email requis';
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) return 'Format email invalide';
        // Vérification des domaines couramment utilisés pour l'éducation
        const educationalDomains = ['edu', 'ac', 'univ', 'school'];
        const domain = email.split('@')[1]?.toLowerCase();
        return '';
    };

    const validatePassword = (password) => {
        if (!password) return 'Mot de passe requis';
        if (password.length < 8) return 'Au moins 8 caractères requis';
        if (!/(?=.*[a-z])/.test(password)) return 'Au moins une minuscule requise';
        if (!/(?=.*[A-Z])/.test(password)) return 'Au moins une majuscule requise';
        if (!/(?=.*\d)/.test(password)) return 'Au moins un chiffre requis';
        if (!/(?=.*[!@#$%^&*])/.test(password)) return 'Au moins un caractère spécial requis (!@#$%^&*)';
        return '';
    };

    const validateBirthday = (birthday) => {
        if (!birthday) return 'Date de naissance requise';
        const today = new Date();
        const birthDate = new Date(birthday);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        if (birthDate > today) return 'Date de naissance invalide';
        if (age < 13) return 'Vous devez avoir au moins 13 ans';
        if (age > 100) return 'Veuillez vérifier votre date de naissance';
        return '';
    };

    const validate = (field, value, allValues = {}) => {
        let error = '';
        switch (field) {
            case 'name':
                error = validateName(value);
                break;
            case 'email':
                error = validateEmail(value);
                break;
            case 'password':
                error = validatePassword(value);
                break;
            case 'confirmPassword':
                if (!value) error = 'Confirmation du mot de passe requise';
                else if (value !== allValues.password) error = 'Les mots de passe ne correspondent pas';
                break;
            case 'birthday':
                error = validateBirthday(value);
                break;
            default:
                break;
        }
        
        setErrors(prev => ({ ...prev, [field]: error }));
        setValidFields(prev => ({ ...prev, [field]: !error && value }));
        return error === '';
    };

    const touch = (field) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const isFieldValid = (field) => validFields[field] && touched[field];
    const isFieldInvalid = (field) => errors[field] && touched[field];

    return { errors, touched, validFields, validate, touch, isFieldValid, isFieldInvalid };
};

// Hook pour la progression du formulaire
const useFormProgress = (validFields, totalFields) => {
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const validCount = Object.values(validFields).filter(Boolean).length;
        setProgress((validCount / totalFields) * 100);
    }, [validFields, totalFields]);

    return progress;
};

// Composant pour l'indicateur de force du mot de passe
const PasswordStrengthMeter = ({ password, isVisible }) => {
    const getStrength = (pass) => {
        if (!pass) return { score: 0, label: 'Aucun', color: '#ddd', suggestions: [] };
        
        let score = 0;
        const suggestions = [];
        
        if (pass.length >= 8) score += 20;
        else suggestions.push('Au moins 8 caractères');
        
        if (/[a-z]/.test(pass)) score += 20;
        else suggestions.push('Une minuscule (a-z)');
        
        if (/[A-Z]/.test(pass)) score += 20;
        else suggestions.push('Une majuscule (A-Z)');
        
        if (/\d/.test(pass)) score += 20;
        else suggestions.push('Un chiffre (0-9)');
        
        if (/[!@#$%^&*]/.test(pass)) score += 20;
        else suggestions.push('Un caractère spécial (!@#$%^&*)');

        const levels = [
            { label: 'Très faible', color: '#f44336' },
            { label: 'Faible', color: '#ff9800' },
            { label: 'Moyen', color: '#ffc107' },
            { label: 'Bon', color: '#4caf50' },
            { label: 'Excellent', color: '#2196f3' }
        ];

        const levelIndex = Math.floor(score / 20);
        return { score, suggestions, ...levels[levelIndex] };
    };

    const strength = getStrength(password);

    if (!isVisible || !password) return null;

    return (
        <div className="password-strength-meter">
            <div className="strength-bar-container">
                <div 
                    className="strength-bar-fill"
                    style={{ 
                        width: `${strength.score}%`,
                        backgroundColor: strength.color
                    }}
                />
            </div>
            <div className="strength-info">
                <span className="strength-label" style={{ color: strength.color }}>
                    {strength.label} ({strength.score}%)
                </span>
                {strength.suggestions.length > 0 && (
                    <div className="strength-suggestions">
                        <p>Suggestions :</p>
                        <ul>
                            {strength.suggestions.map((suggestion, index) => (
                                <li key={index}>{suggestion}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

// Composant pour le sélecteur de rôle avec cartes
const RoleSelector = ({ value, onChange, touched, error }) => {
    const roles = [
        {
            value: 'student',
            title: 'Étudiant',
            description: 'Accédez aux cours, exercices et suivez vos progrès',
            icon: '👨‍🎓',
            features: ['Cours interactifs', 'Exercices personnalisés', 'Suivi des progrès', 'Certifications']
        },
        {
            value: 'teacher',
            title: 'Professeur',
            description: 'Créez des cours, gérez vos étudiants et analysez leurs performances',
            icon: '👨‍🏫',
            features: ['Création de cours', 'Gestion des étudiants', 'Analytics avancés', 'Outils pédagogiques']
        }
    ];

    return (
        <div className="role-selector">
            <label className="role-label">Choisissez votre profil</label>
            <div className="role-cards">
                {roles.map((role) => (
                    <div
                        key={role.value}
                        className={`role-card ${value === role.value ? 'selected' : ''}`}
                        onClick={() => onChange({ target: { name: 'role', value: role.value } })}
                    >
                        <div className="role-icon">{role.icon}</div>
                        <h3>{role.title}</h3>
                        <p>{role.description}</p>
                        <ul className="role-features">
                            {role.features.map((feature, index) => (
                                <li key={index}>✓ {feature}</li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
            {touched && error && <div className="error-message">{error}</div>}
        </div>
    );
};

// Composant principal SignUp
const SignUp = ({ addNotification }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        birthday: '',
        role: 'student',
        acceptTerms: false,
        acceptNewsletter: false
    });

    const [currentStep, setCurrentStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [emailSuggestions, setEmailSuggestions] = useState([]);
    const [isFormVisible, setIsFormVisible] = useState(false);

    const navigate = useNavigate();
    const formRef = useRef();
    const { errors, touched, validFields, validate, touch, isFieldValid, isFieldInvalid } = useAdvancedValidation();
    const progress = useFormProgress(validFields, 6); // 6 champs obligatoires

    // Animation d'entrée
    useEffect(() => {
        setIsFormVisible(true);
    }, []);

    // Suggestions d'email
    useEffect(() => {
        if (formData.email && formData.email.includes('@') && !formData.email.includes('.')) {
            const commonDomains = ['gmail.com', 'outlook.com', 'yahoo.com', 'hotmail.com', 'edu.fr', 'univ-paris.fr'];
            const username = formData.email.split('@')[0];
            const suggestions = commonDomains.map(domain => `${username}@${domain}`);
            setEmailSuggestions(suggestions);
        } else {
            setEmailSuggestions([]);
        }
    }, [formData.email]);

    // Validation en temps réel
    useEffect(() => {
        Object.keys(formData).forEach(field => {
            if (touched[field]) {
                validate(field, formData[field], formData);
            }
        });
    }, [formData, touched, validate]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        
        setFormData(prev => ({ ...prev, [name]: newValue }));
        
        if (touched[name]) {
            validate(name, newValue, { ...formData, [name]: newValue });
        }
    };

    const handleBlur = (field) => {
        touch(field);
        validate(field, formData[field], formData);
    };

    const handleEmailSuggestionClick = (suggestion) => {
        setFormData(prev => ({ ...prev, email: suggestion }));
        setEmailSuggestions([]);
        validate('email', suggestion, formData);
    };

    const getAge = (birthday) => {
        if (!birthday) return 0;
        const today = new Date();
        const birthDate = new Date(birthday);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const getSuggestedRole = () => {
        const age = getAge(formData.birthday);
        if (age >= 22) return 'teacher';
        return 'student';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation finale
        const fieldsToValidate = ['name', 'email', 'password', 'confirmPassword', 'birthday'];
        let allValid = true;

        fieldsToValidate.forEach(field => {
            touch(field);
            if (!validate(field, formData[field], formData)) {
                allValid = false;
            }
        });

        if (!formData.acceptTerms) {
            if (addNotification) {
                addNotification('Vous devez accepter les conditions d\'utilisation', 'error');
            }
            return;
        }

        if (!allValid) {
            if (addNotification) {
                addNotification('Veuillez corriger les erreurs du formulaire', 'error');
            }
            return;
        }

        setIsLoading(true);

        try {
            const registrationData = {
                name: formData.name.trim(),
                email: formData.email.toLowerCase().trim(),
                password: formData.password,
                birthday: formData.birthday,
                role: formData.role,
                acceptNewsletter: formData.acceptNewsletter
            };

            const response = await axios.post('http://localhost:5000/api/users/register', registrationData);
            
            if (addNotification) {
                addNotification('Inscription réussie ! Redirection vers la connexion...', 'success');
            }

            // Sauvegarde de l'email pour la page de connexion
            localStorage.setItem('signupEmail', formData.email);

            // Redirection après délai pour voir la notification
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            console.error('Erreur d\'inscription:', err);
            const errorMessage = err.response?.data?.message || 'Une erreur est survenue lors de l\'inscription.';
            
            if (addNotification) {
                addNotification(errorMessage, 'error');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`signup-container ${isFormVisible ? 'animate-in' : ''}`}>
            <div className="background-effects">
                <div className="circle circle-1"></div>
                <div className="circle circle-2"></div>
                <div className="circle circle-3"></div>
            </div>

            <div className="signup-card">
                {/* Header */}
                <div className="signup-header">
                    <div className="logo-section">
                        <span className="logo">🧮</span>
                        <h1>Mathemann</h1>
                    </div>
                    <h2>Créer votre compte</h2>
                    <p className="subtitle">Rejoignez notre communauté d'apprentissage des mathématiques</p>
                </div>

                {/* Barre de progression */}
                <div className="progress-container">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <span className="progress-text">
                        Progression : {Math.round(progress)}%
                    </span>
                </div>

                {/* Formulaire */}
                <form ref={formRef} onSubmit={handleSubmit} className="signup-form">
                    {/* Nom complet */}
                    <div className="form-group">
                        <label htmlFor="name" className={`floating-label ${formData.name ? 'floating' : ''}`}>
                            Nom complet
                        </label>
                        <div className={`input-wrapper ${isFieldValid('name') ? 'valid' : ''} ${isFieldInvalid('name') ? 'invalid' : ''}`}>
                            <span className="input-icon">👤</span>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                onBlur={() => handleBlur('name')}
                                className="form-input"
                                placeholder="Votre nom complet"
                                autoComplete="name"
                            />
                            {isFieldValid('name') && <span className="validation-icon success">✓</span>}
                            {isFieldInvalid('name') && <span className="validation-icon error">✗</span>}
                        </div>
                        {touched.name && errors.name && <div className="error-message">{errors.name}</div>}
                    </div>

                    {/* Email */}
                    <div className="form-group">
                        <label htmlFor="email" className={`floating-label ${formData.email ? 'floating' : ''}`}>
                            Adresse email
                        </label>
                        <div className={`input-wrapper ${isFieldValid('email') ? 'valid' : ''} ${isFieldInvalid('email') ? 'invalid' : ''}`}>
                            <span className="input-icon">📧</span>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                onBlur={() => handleBlur('email')}
                                className="form-input"
                                placeholder="votre@email.com"
                                autoComplete="email"
                            />
                            {isFieldValid('email') && <span className="validation-icon success">✓</span>}
                            {isFieldInvalid('email') && <span className="validation-icon error">✗</span>}
                        </div>
                        
                        {/* Suggestions d'email */}
                        {emailSuggestions.length > 0 && (
                            <div className="email-suggestions">
                                <p>Suggestions :</p>
                                {emailSuggestions.slice(0, 3).map((suggestion, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        className="suggestion-btn"
                                        onClick={() => handleEmailSuggestionClick(suggestion)}
                                    >
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        )}
                        
                        {touched.email && errors.email && <div className="error-message">{errors.email}</div>}
                    </div>

                    {/* Mot de passe */}
                    <div className="form-group">
                        <label htmlFor="password" className={`floating-label ${formData.password ? 'floating' : ''}`}>
                            Mot de passe
                        </label>
                        <div className={`input-wrapper ${isFieldValid('password') ? 'valid' : ''} ${isFieldInvalid('password') ? 'invalid' : ''}`}>
                            <span className="input-icon">🔒</span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                onBlur={() => handleBlur('password')}
                                className="form-input"
                                placeholder="Votre mot de passe sécurisé"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                            {isFieldValid('password') && <span className="validation-icon success">✓</span>}
                            {isFieldInvalid('password') && <span className="validation-icon error">✗</span>}
                        </div>
                        
                        <PasswordStrengthMeter 
                            password={formData.password} 
                            isVisible={formData.password.length > 0} 
                        />
                        
                        {touched.password && errors.password && <div className="error-message">{errors.password}</div>}
                    </div>

                    {/* Confirmation du mot de passe */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword" className={`floating-label ${formData.confirmPassword ? 'floating' : ''}`}>
                            Confirmer le mot de passe
                        </label>
                        <div className={`input-wrapper ${isFieldValid('confirmPassword') ? 'valid' : ''} ${isFieldInvalid('confirmPassword') ? 'invalid' : ''}`}>
                            <span className="input-icon">🔐</span>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                onBlur={() => handleBlur('confirmPassword')}
                                className="form-input"
                                placeholder="Confirmez votre mot de passe"
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                            {isFieldValid('confirmPassword') && <span className="validation-icon success">✓</span>}
                            {isFieldInvalid('confirmPassword') && <span className="validation-icon error">✗</span>}
                        </div>
                        {touched.confirmPassword && errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
                    </div>

                    {/* Date de naissance */}
                    <div className="form-group">
                        <label htmlFor="birthday" className={`floating-label ${formData.birthday ? 'floating' : ''}`}>
                            Date de naissance
                        </label>
                        <div className={`input-wrapper ${isFieldValid('birthday') ? 'valid' : ''} ${isFieldInvalid('birthday') ? 'invalid' : ''}`}>
                            <span className="input-icon">🎂</span>
                            <input
                                type="date"
                                id="birthday"
                                name="birthday"
                                value={formData.birthday}
                                onChange={handleChange}
                                onBlur={() => handleBlur('birthday')}
                                className="form-input"
                                max={new Date().toISOString().split('T')[0]}
                            />
                            {isFieldValid('birthday') && <span className="validation-icon success">✓</span>}
                            {isFieldInvalid('birthday') && <span className="validation-icon error">✗</span>}
                        </div>
                        {formData.birthday && (
                            <div className="age-display">
                                Âge : {getAge(formData.birthday)} ans
                                {getAge(formData.birthday) >= 22 && (
                                    <span className="age-suggestion">
                                        💡 Nous suggérons le profil "Professeur" pour votre âge
                                    </span>
                                )}
                            </div>
                        )}
                        {touched.birthday && errors.birthday && <div className="error-message">{errors.birthday}</div>}
                    </div>

                    {/* Sélecteur de rôle */}
                    <RoleSelector
                        value={formData.role}
                        onChange={handleChange}
                        touched={touched.role}
                        error={errors.role}
                    />

                    {/* Conditions et newsletter */}
                    <div className="form-options">
                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                name="acceptTerms"
                                checked={formData.acceptTerms}
                                onChange={handleChange}
                                required
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-text">
                                J'accepte les <Link to="/terms" target="_blank">conditions d'utilisation</Link> et la 
                                <Link to="/privacy" target="_blank"> politique de confidentialité</Link>
                            </span>
                        </label>

                        <label className="checkbox-container">
                            <input
                                type="checkbox"
                                name="acceptNewsletter"
                                checked={formData.acceptNewsletter}
                                onChange={handleChange}
                            />
                            <span className="checkmark"></span>
                            <span className="checkbox-text">
                                Je souhaite recevoir la newsletter avec les dernières actualités et conseils d'apprentissage
                            </span>
                        </label>
                    </div>

                    {/* Bouton d'inscription */}
                    <button 
                        type="submit" 
                        className={`signup-button ${isLoading ? 'loading' : ''}`}
                        disabled={isLoading || !formData.acceptTerms}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner"></span>
                                <span>Création du compte...</span>
                            </>
                        ) : (
                            <>
                                <span>Créer mon compte</span>
                                <span className="arrow">→</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="signup-footer">
                    <p>Vous avez déjà un compte ?</p>
                    <Link to="/login" className="login-link">
                        Se connecter
                    </Link>
                </div>
            </div>

            {/* Avantages */}
            <div className="benefits-section">
                <h3>Pourquoi rejoindre Mathemann ?</h3>
                <div className="benefits-grid">
                    <div className="benefit-item">
                        <span className="benefit-icon">🎯</span>
                        <span>Apprentissage personnalisé</span>
                    </div>
                    <div className="benefit-item">
                        <span className="benefit-icon">📊</span>
                        <span>Suivi des progrès</span>
                    </div>
                    <div className="benefit-item">
                        <span className="benefit-icon">🏆</span>
                        <span>Certifications reconnues</span>
                    </div>
                    <div className="benefit-item">
                        <span className="benefit-icon">👥</span>
                        <span>Communauté active</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignUp;