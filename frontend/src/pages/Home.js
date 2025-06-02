import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import "./Home.css";
import { FaGraduationCap, FaChalkboardTeacher, FaLaptopCode, FaPlay, FaUsers, FaStar, FaArrowRight, FaCheck } from "react-icons/fa";

// Hook personnalisé pour l'animation d'apparition au scroll
const useScrollAnimation = () => {
    const [animatedElements, setAnimatedElements] = useState(new Set());
    
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setAnimatedElements(prev => new Set([...prev, entry.target.id]));
                    }
                });
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        // Observer tous les éléments avec data-animate
        document.querySelectorAll('[data-animate]').forEach((el) => {
            if (el.id) observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return animatedElements;
};

// Composant pour les statistiques animées
const AnimatedCounter = ({ end, duration = 2000, suffix = "" }) => {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef();

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !isVisible) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) observer.observe(ref.current);
        return () => observer.disconnect();
    }, [isVisible]);

    useEffect(() => {
        if (!isVisible) return;

        let startTime;
        const animate = (currentTime) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);
            
            setCount(Math.floor(progress * end));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [isVisible, end, duration]);

    return (
        <span ref={ref} className="animated-counter">
            {count.toLocaleString()}{suffix}
        </span>
    );
};

// Composant pour les témoignages
const TestimonialCard = ({ name, role, content, rating, avatar }) => (
    <div className="testimonial-card">
        <div className="testimonial-header">
            <div className="avatar">
                <img src={avatar} alt={name} />
            </div>
            <div className="user-info">
                <h4>{name}</h4>
                <p>{role}</p>
            </div>
            <div className="rating">
                {[...Array(5)].map((_, i) => (
                    <FaStar key={i} className={i < rating ? 'filled' : ''} />
                ))}
            </div>
        </div>
        <p className="testimonial-content">"{content}"</p>
    </div>
);

// Composant pour la démo interactive
const InteractiveDemo = () => {
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const demoSteps = [
        {
            title: "Évaluation initiale",
            description: "Nous évaluons votre niveau actuel",
            icon: "📊"
        },
        {
            title: "Parcours personnalisé",
            description: "Création d'un plan d'apprentissage unique",
            icon: "🎯"
        },
        {
            title: "Apprentissage interactif",
            description: "Leçons engageantes et exercices pratiques",
            icon: "🎓"
        },
        {
            title: "Suivi des progrès",
            description: "Tableaux de bord détaillés et analyses",
            icon: "📈"
        }
    ];

    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentStep(prev => (prev + 1) % demoSteps.length);
            }, 3000);
        }
        return () => clearInterval(interval);
    }, [isPlaying, demoSteps.length]);

    return (
        <div className="interactive-demo">
            <div className="demo-controls">
                <button 
                    className={`play-btn ${isPlaying ? 'playing' : ''}`}
                    onClick={() => setIsPlaying(!isPlaying)}
                >
                    <FaPlay />
                    {isPlaying ? 'Pause la démo' : 'Voir la démo'}
                </button>
            </div>
            
            <div className="demo-steps">
                {demoSteps.map((step, index) => (
                    <div 
                        key={index}
                        className={`demo-step ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
                        onClick={() => setCurrentStep(index)}
                    >
                        <div className="step-icon">{step.icon}</div>
                        <div className="step-content">
                            <h4>{step.title}</h4>
                            <p>{step.description}</p>
                        </div>
                        {index < currentStep && <FaCheck className="check-icon" />}
                    </div>
                ))}
            </div>
        </div>
    );
};

// Composant principal Home
const Home = ({ addNotification }) => {
    const navigate = useNavigate();
    const animatedElements = useScrollAnimation();
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [email, setEmail] = useState('');
    const [isSubscribed, setIsSubscribed] = useState(false);

    // Animation de particules en arrière-plan
    useEffect(() => {
        const createParticle = () => {
            const particle = document.createElement('div');
            particle.className = 'floating-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDuration = (Math.random() * 3 + 2) + 's';
            particle.style.opacity = Math.random() * 0.5 + 0.1;
            
            const hero = document.querySelector('.hero');
            if (hero) {
                hero.appendChild(particle);
                setTimeout(() => particle.remove(), 5000);
            }
        };

        const interval = setInterval(createParticle, 2000);
        return () => clearInterval(interval);
    }, []);

    const handleGetStarted = () => {
        if (addNotification) {
            addNotification('Redirection vers l\'inscription...', 'info');
        }
        navigate('/signup');
    };

    const handleLearnMore = () => {
        if (addNotification) {
            addNotification('Découvrez nos cours !', 'info');
        }
        navigate('/learning');
    };

    const handleNewsletterSignup = (e) => {
        e.preventDefault();
        if (email) {
            setIsSubscribed(true);
            if (addNotification) {
                addNotification('Merci pour votre inscription à notre newsletter !', 'success');
            }
            setEmail('');
        }
    };

    const testimonials = [
        {
            name: "Marie Dubois",
            role: "Étudiante en terminale",
            content: "Mathemann m'a aidée à comprendre les maths complexes. Mes notes ont considérablement amélioré !",
            rating: 5,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie"
        },
        {
            name: "Prof. Jean Martin",
            role: "Enseignant de mathématiques",
            content: "Une plateforme exceptionnelle que je recommande à tous mes étudiants. Les outils sont fantastiques !",
            rating: 5,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jean"
        },
        {
            name: "Sophie Chen",
            role: "Parent d'élève",
            content: "Mon fils adore apprendre les maths maintenant. Le côté interactif fait toute la différence !",
            rating: 5,
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie"
        }
    ];

    return (
        <div className="home-container">
            {/* Section Hero améliorée */}
            <section className="hero">
                <div className="hero-content" data-animate id="hero-content">
                    <div className="hero-badge">
                        <span className="badge-text">🎉 Nouveau : IA d'apprentissage personnalisé</span>
                    </div>
                    
                    <h1 className="hero-title">
                        Bienvenue sur <span className="brand-highlight">Mathemann</span>
                    </h1>
                    
                    <p className="hero-subtitle">
                        Transformez votre apprentissage des mathématiques avec notre 
                        <strong> plateforme alimentée par l'IA</strong> qui s'adapte à votre rythme et à votre style d'apprentissage.
                    </p>

                    <div className="hero-stats">
                        <div className="stat-item">
                            <AnimatedCounter end={10000} suffix="+" />
                            <span>Étudiants</span>
                        </div>
                        <div className="stat-item">
                            <AnimatedCounter end={500} suffix="+" />
                            <span>Professeurs</span>
                        </div>
                        <div className="stat-item">
                            <AnimatedCounter end={95} suffix="%" />
                            <span>Satisfaction</span>
                        </div>
                    </div>
                    
                    <div className="cta-buttons">
                        <button 
                            onClick={handleGetStarted}
                            className="cta-button primary"
                        >
                            <span>Commencer gratuitement</span>
                            <FaArrowRight className="arrow-icon" />
                        </button>
                        <button 
                            onClick={() => setIsVideoPlaying(true)}
                            className="cta-button secondary video-btn"
                        >
                            <FaPlay className="play-icon" />
                            <span>Voir la démo (2 min)</span>
                        </button>
                    </div>

                    <div className="trust-indicators">
                        <p>Rejoignez des milliers d'étudiants qui nous font confiance</p>
                        <div className="trust-logos">
                            <span>🏫 Utilisé dans 200+ écoles</span>
                            <span>🏆 Prix Innovation EdTech 2024</span>
                            <span>⭐ 4.9/5 sur les stores</span>
                        </div>
                    </div>
                </div>
                
                <div className="hero-visual">
                    <div className="hero-image-container">
                        <img src="./ftre.jpg" alt="Apprentissage des mathématiques" className="hero-image" />
                        <div className="floating-elements">
                            <div className="floating-card card-1">
                                <div className="card-icon">📈</div>
                                <div className="card-text">Progrès +89%</div>
                            </div>
                            <div className="floating-card card-2">
                                <div className="card-icon">🎯</div>
                                <div className="card-text">Objectifs atteints</div>
                            </div>
                            <div className="floating-card card-3">
                                <div className="card-icon">⚡</div>
                                <div className="card-text">Apprentissage rapide</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            
            {/* Section Fonctionnalités améliorée */}
            <section className="features" data-animate id="features">
                <div className="section-header">
                    <h2>Pourquoi choisir Mathemann ?</h2>
                    <p>Découvrez les fonctionnalités qui font de notre plateforme la référence en éducation mathématique</p>
                </div>
                
                <div className="features-grid">
                    <div className="feature-card advanced">
                        <div className="feature-icon">
                            <FaGraduationCap />
                            <div className="icon-pulse"></div>
                        </div>
                        <h3>Apprentissage Personnalisé</h3>
                        <p>Notre IA analyse votre style d'apprentissage et adapte le contenu à votre niveau et vos préférences.</p>
                        <ul className="feature-benefits">
                            <li><FaCheck /> Évaluation continue du niveau</li>
                            <li><FaCheck /> Contenu adaptatif en temps réel</li>
                            <li><FaCheck /> Parcours d'apprentissage unique</li>
                        </ul>
                        <div className="feature-cta">
                            <button onClick={handleLearnMore}>En savoir plus</button>
                        </div>
                    </div>
                    
                    <div className="feature-card advanced">
                        <div className="feature-icon">
                            <FaChalkboardTeacher />
                            <div className="icon-pulse"></div>
                        </div>
                        <h3>Professeurs Experts</h3>
                        <p>Apprenez auprès d'éducateurs professionnels certifiés avec des années d'expérience pédagogique.</p>
                        <ul className="feature-benefits">
                            <li><FaCheck /> Professeurs certifiés</li>
                            <li><FaCheck /> Support 24/7 disponible</li>
                            <li><FaCheck /> Sessions one-to-one possibles</li>
                        </ul>
                        <div className="feature-cta">
                            <button onClick={handleLearnMore}>Rencontrer nos profs</button>
                        </div>
                    </div>
                    
                    <div className="feature-card advanced">
                        <div className="feature-icon">
                            <FaLaptopCode />
                            <div className="icon-pulse"></div>
                        </div>
                        <h3>Plateforme Interactive</h3>
                        <p>Engagez-vous avec du contenu dynamique, des simulations et un suivi détaillé de vos progrès.</p>
                        <ul className="feature-benefits">
                            <li><FaCheck /> Exercices interactifs</li>
                            <li><FaCheck /> Simulations mathématiques</li>
                            <li><FaCheck /> Tableaux de bord avancés</li>
                        </ul>
                        <div className="feature-cta">
                            <button onClick={handleGetStarted}>Essayer maintenant</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Nouvelle section : Démo interactive */}
            <section className="demo-section" data-animate id="demo">
                <div className="section-header">
                    <h2>Comment ça marche ?</h2>
                    <p>Découvrez votre parcours d'apprentissage en 4 étapes simples</p>
                </div>
                <InteractiveDemo />
            </section>
            
            {/* Section Comment ça marche améliorée */}
            <section className="how-it-works" data-animate id="how-it-works">
                <h2>Votre parcours d'apprentissage</h2>
                <div className="steps-container">
                    <div className="steps">
                        <div className="step">
                            <div className="step-number">1</div>
                            <div className="step-content">
                                <h3>Inscription gratuite</h3>
                                <p>Créez votre compte en 2 minutes et complétez votre profil d'apprentissage personnalisé</p>
                                <div className="step-features">
                                    <span className="feature-tag">✨ Gratuit</span>
                                    <span className="feature-tag">⚡ Rapide</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="step">
                            <div className="step-number">2</div>
                            <div className="step-content">
                                <h3>Évaluation intelligente</h3>
                                <p>Notre IA évalue votre niveau et identifie vos forces et domaines d'amélioration</p>
                                <div className="step-features">
                                    <span className="feature-tag">🎯 Précis</span>
                                    <span className="feature-tag">🧠 IA avancée</span>
                                </div>
                            </div>
                        </div>
                        
                        <div className="step">
                            <div className="step-number">3</div>
                            <div className="step-content">
                                <h3>Apprentissage personnalisé</h3>
                                <p>Commencez votre parcours avec des leçons adaptées à votre niveau et vos objectifs</p>
                                <div className="step-features">
                                    <span className="feature-tag">📚 Contenu riche</span>
                                    <span className="feature-tag">🎮 Interactif</span>
                                </div>
                            </div>
                        </div>

                        <div className="step">
                            <div className="step-number">4</div>
                            <div className="step-content">
                                <h3>Suivi et amélioration</h3>
                                <p>Suivez vos progrès en temps réel et célébrez vos réussites</p>
                                <div className="step-features">
                                    <span className="feature-tag">📊 Analytics</span>
                                    <span className="feature-tag">🏆 Récompenses</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="progress-line"></div>
                </div>
            </section>

            {/* Nouvelle section : Témoignages */}
            <section className="testimonials" data-animate id="testimonials">
                <div className="section-header">
                    <h2>Ce que disent nos utilisateurs</h2>
                    <p>Plus de 10 000 étudiants nous font confiance</p>
                </div>
                
                <div className="testimonials-grid">
                    {testimonials.map((testimonial, index) => (
                        <TestimonialCard key={index} {...testimonial} />
                    ))}
                </div>
            </section>

            {/* Nouvelle section : Newsletter */}
            <section className="newsletter" data-animate id="newsletter">
                <div className="newsletter-content">
                    <h2>Restez informé</h2>
                    <p>Recevez nos dernières actualités, conseils d'apprentissage et offres exclusives</p>
                    
                    {!isSubscribed ? (
                        <form onSubmit={handleNewsletterSignup} className="newsletter-form">
                            <div className="input-group">
                                <input
                                    type="email"
                                    placeholder="Votre adresse email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <button type="submit">S'abonner</button>
                            </div>
                            <p className="privacy-note">
                                🔒 Nous respectons votre vie privée. Pas de spam, désinscription facile.
                            </p>
                        </form>
                    ) : (
                        <div className="subscription-success">
                            <div className="success-icon">✅</div>
                            <h3>Merci pour votre inscription !</h3>
                            <p>Vous recevrez bientôt nos meilleurs conseils d'apprentissage.</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Section CTA finale */}
            <section className="final-cta" data-animate id="final-cta">
                <div className="cta-content">
                    <h2>Prêt à transformer votre apprentissage des maths ?</h2>
                    <p>Rejoignez des milliers d'étudiants qui ont déjà amélioré leurs compétences avec Mathemann</p>
                    
                    <div className="cta-buttons-final">
                        <button onClick={handleGetStarted} className="cta-button primary large">
                            Commencer maintenant - C'est gratuit !
                        </button>
                        <p className="cta-note">
                            ✨ Essai gratuit de 14 jours • Aucune carte de crédit requise
                        </p>
                    </div>
                </div>
            </section>

            {/* Modal vidéo */}
            {isVideoPlaying && (
                <div className="video-modal" onClick={() => setIsVideoPlaying(false)}>
                    <div className="video-container" onClick={(e) => e.stopPropagation()}>
                        <button 
                            className="close-video"
                            onClick={() => setIsVideoPlaying(false)}
                        >
                            ×
                        </button>
                        <div className="video-placeholder">
                            <h3>🎬 Démo de Mathemann</h3>
                            <p>Découvrez comment notre plateforme transforme l'apprentissage des mathématiques</p>
                            <div className="video-features">
                                <span>📚 Cours interactifs</span>
                                <span>🎯 IA personnalisée</span>
                                <span>📊 Suivi des progrès</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;