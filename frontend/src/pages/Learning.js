import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Learning.css";
import { 
    FaChalkboardTeacher, 
    FaPuzzlePiece, 
    FaGraduationCap, 
    FaBookOpen,
    FaPlay,
    FaStar,
    FaClock,
    FaUsers,
    FaTrophy,
    FaChartLine,
    FaLightbulb,
    FaRocket,
    FaSearch,
    FaFilter,
    FaHeart,
    FaShare,
    FaDownload
} from "react-icons/fa";

// Hook personnalisé pour l'animation au scroll
const useScrollAnimation = () => {
    const [visibleElements, setVisibleElements] = useState(new Set());

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setVisibleElements(prev => new Set([...prev, entry.target.dataset.animate]));
                    }
                });
            },
            { threshold: 0.1, rootMargin: '50px' }
        );

        document.querySelectorAll('[data-animate]').forEach((el) => {
            observer.observe(el);
        });

        return () => observer.disconnect();
    }, []);

    return visibleElements;
};

// Hook pour les statistiques animées
const useAnimatedStats = (isVisible) => {
    const [stats, setStats] = useState({
        students: 0,
        courses: 0,
        completion: 0,
        satisfaction: 0
    });

    useEffect(() => {
        if (!isVisible) return;

        const targets = {
            students: 15420,
            courses: 127,
            completion: 94,
            satisfaction: 98
        };

        const duration = 2000;
        const steps = 60;
        const stepDuration = duration / steps;

        Object.keys(targets).forEach(key => {
            let current = 0;
            const increment = targets[key] / steps;
            
            const timer = setInterval(() => {
                current += increment;
                if (current >= targets[key]) {
                    current = targets[key];
                    clearInterval(timer);
                }
                setStats(prev => ({ ...prev, [key]: Math.floor(current) }));
            }, stepDuration);
        });
    }, [isVisible]);

    return stats;
};

// Composant pour le compteur animé
const AnimatedCounter = ({ target, suffix = "", prefix = "", duration = 2000 }) => {
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
            
            setCount(Math.floor(progress * target));
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }, [isVisible, target, duration]);

    return (
        <span ref={ref} className="animated-counter">
            {prefix}{count.toLocaleString()}{suffix}
        </span>
    );
};

// Composant pour la barre de recherche avancée
const SearchBar = ({ onSearch, onFilter }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [isExpanded, setIsExpanded] = useState(false);

    const filters = [
        { id: 'all', label: 'Tous les cours', icon: <FaBookOpen /> },
        { id: 'beginner', label: 'Débutant', icon: <FaGraduationCap /> },
        { id: 'intermediate', label: 'Intermédiaire', icon: <FaChartLine /> },
        { id: 'advanced', label: 'Avancé', icon: <FaTrophy /> }
    ];

    const handleSearch = (e) => {
        e.preventDefault();
        onSearch(searchTerm);
    };

    return (
        <div className={`search-container ${isExpanded ? 'expanded' : ''}`}>
            <form onSubmit={handleSearch} className="search-form">
                <div className="search-input-wrapper">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Rechercher un cours, sujet..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setIsExpanded(true)}
                        onBlur={() => setTimeout(() => setIsExpanded(false), 200)}
                        className="search-input"
                    />
                    <button type="submit" className="search-btn">
                        Rechercher
                    </button>
                </div>
            </form>
            
            <div className="filter-tabs">
                {filters.map(filter => (
                    <button
                        key={filter.id}
                        className={`filter-tab ${activeFilter === filter.id ? 'active' : ''}`}
                        onClick={() => {
                            setActiveFilter(filter.id);
                            onFilter(filter.id);
                        }}
                    >
                        {filter.icon}
                        <span>{filter.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

// Composant pour une carte de cours avancée
const CourseCard = ({ course, onEnroll, isFavorite, onToggleFavorite }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className={`course-card ${isHovered ? 'hovered' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="course-image">
                <img src={course.image} alt={course.title} />
                <div className="course-overlay">
                    <button className="play-btn">
                        <FaPlay />
                        <span>Aperçu</span>
                    </button>
                </div>
                <div className="course-badges">
                    {course.isNew && <span className="badge new">Nouveau</span>}
                    {course.isPopular && <span className="badge popular">Populaire</span>}
                    <span className={`badge level ${course.level}`}>{course.level}</span>
                </div>
            </div>
            
            <div className="course-content">
                <div className="course-header">
                    <h3>{course.title}</h3>
                    <button 
                        className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                        onClick={() => onToggleFavorite(course.id)}
                    >
                        <FaHeart />
                    </button>
                </div>
                
                <p className="course-description">{course.description}</p>
                
                <div className="course-instructor">
                    <img src={course.instructor.avatar} alt={course.instructor.name} />
                    <div>
                        <span className="instructor-name">{course.instructor.name}</span>
                        <span className="instructor-title">{course.instructor.title}</span>
                    </div>
                </div>
                
                <div className="course-stats">
                    <div className="stat">
                        <FaStar className="star-icon" />
                        <span>{course.rating}</span>
                        <span className="rating-count">({course.reviews})</span>
                    </div>
                    <div className="stat">
                        <FaUsers />
                        <span>{course.enrolled.toLocaleString()}</span>
                    </div>
                    <div className="stat">
                        <FaClock />
                        <span>{course.duration}</span>
                    </div>
                </div>
                
                <div className="course-progress">
                    <div className="progress-label">
                        <span>Progression</span>
                        <span>{course.progress}%</span>
                    </div>
                    <div className="progress-bar">
                        <div 
                            className="progress-fill"
                            style={{ width: `${course.progress}%` }}
                        />
                    </div>
                </div>
                
                <div className="course-actions">
                    <button 
                        className="enroll-btn primary"
                        onClick={() => onEnroll(course.id)}
                    >
                        {course.progress > 0 ? 'Continuer' : 'Commencer'}
                    </button>
                    <button className="action-btn">
                        <FaShare />
                    </button>
                    <button className="action-btn">
                        <FaDownload />
                    </button>
                </div>
            </div>
        </div>
    );
};

// Composant pour les témoignages
const TestimonialCard = ({ testimonial }) => (
    <div className="testimonial-card">
        <div className="testimonial-content">
            <div className="quote-icon">"</div>
            <p>{testimonial.content}</p>
        </div>
        <div className="testimonial-author">
            <img src={testimonial.avatar} alt={testimonial.name} />
            <div>
                <h4>{testimonial.name}</h4>
                <span>{testimonial.role}</span>
                <div className="rating">
                    {[...Array(5)].map((_, i) => (
                        <FaStar key={i} className={i < testimonial.rating ? 'filled' : ''} />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

// Composant principal Learning
const Learning = ({ addNotification, metrics }) => {
    const navigate = useNavigate();
    const visibleElements = useScrollAnimation();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState('all');
    const [favorites, setFavorites] = useState(new Set());
    const [currentTestimonial, setCurrentTestimonial] = useState(0);
    
    const statsVisible = visibleElements.has('stats');
    const animatedStats = useAnimatedStats(statsVisible);

    // Données des cours (normalement depuis une API)
    const courses = [
        {
            id: 1,
            title: "Algèbre Fondamentale",
            description: "Maîtrisez les bases de l'algèbre avec des exemples concrets et des exercices interactifs.",
            image: "https://images.unsplash.com/photo-1509228468518-180dd4864904?w=400&h=250&fit=crop",
            instructor: {
                name: "Dr. Mohamed El Amin TAYOUBY;",
                title: "Professeure de Mathématiques",
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marie"
            },
            rating: 4.8,
            reviews: 324,
            enrolled: 1205,
            duration: "6 semaines",
            level: "beginner",
            progress: 65,
            isNew: false,
            isPopular: true
        },
        {
            id: 2,
            title: "Géométrie Avancée",
            description: "Explorez les concepts avancés de géométrie euclidienne et non-euclidienne.",
            image: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=250&fit=crop",
            instructor: {
                name: "Prof. EL Yazid TEBBAA",
                title: "Expert en Géométrie",
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jean"
            },
            rating: 4.9,
            reviews: 198,
            enrolled: 856,
            duration: "8 semaines",
            level: "advanced",
            progress: 0,
            isNew: true,
            isPopular: false
        },
        {
            id: 3,
            title: "Statistiques Appliquées",
            description: "Apprenez les statistiques avec des applications pratiques en sciences et économie.",
            image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop",
            instructor: {
                name: "Dr. Maaly Moulay EL Hassen",
                title: "Statisticienne",
                avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie"
            },
            rating: 4.7,
            reviews: 412,
            enrolled: 2103,
            duration: "10 semaines",
            level: "intermediate",
            progress: 30,
            isNew: false,
            isPopular: true
        }
    ];

    const testimonials = [
        {
            name: "Emma Rodriguez",
            role: "Étudiante en ingénierie",
            content: "Mathemann a transformé ma compréhension des mathématiques. Les cours sont clairs, interactifs et vraiment efficaces !",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma",
            rating: 5
        },
        {
            name: "Thomas Leroy",
            role: "Professeur de lycée",
            content: "J'utilise Mathemann pour mes propres cours. La qualité pédagogique est exceptionnelle, mes élèves adorent !",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Thomas",
            rating: 5
        },
        {
            name: "Lisa Wang",
            role: "Data Scientist",
            content: "Parfait pour se remettre à niveau. Les explications sont précises et les exercices très bien conçus.",
            avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa",
            rating: 5
        }
    ];

    const features = [
        { 
            icon: <FaChalkboardTeacher />, 
            title: "Professeurs Experts", 
            description: "Apprenez auprès d'experts de l'industrie et d'instructeurs expérimentés avec des années de pédagogie.",
            color: "#4f46e5"
        },
        { 
            icon: <FaPuzzlePiece />, 
            title: "Quiz Interactifs", 
            description: "Renforcez votre apprentissage avec des quiz engageants et des exercices pratiques adaptatifs.",
            color: "#06b6d4"
        },
        { 
            icon: <FaGraduationCap />, 
            title: "Parcours Personnalisés", 
            description: "Expériences d'apprentissage sur mesure adaptées à vos objectifs et votre niveau unique.",
            color: "#10b981"
        },
        { 
            icon: <FaBookOpen />, 
            title: "Ressources Complètes", 
            description: "Accédez à une vaste gamme de matériels d'apprentissage pour approfondir vos connaissances.",
            color: "#f59e0b"
        },
        {
            icon: <FaLightbulb />,
            title: "IA Adaptative",
            description: "Notre intelligence artificielle s'adapte à votre rythme d'apprentissage pour une expérience optimale.",
            color: "#8b5cf6"
        },
        {
            icon: <FaRocket />,
            title: "Progression Rapide",
            description: "Méthodes d'apprentissage efficaces pour progresser rapidement et atteindre vos objectifs.",
            color: "#ef4444"
        }
    ];

    // Rotation automatique des témoignages
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [testimonials.length]);

    const handleSearch = (term) => {
        setSearchTerm(term);
        if (addNotification) {
            addNotification(`Recherche : "${term}"`, 'info');
        }
    };

    const handleFilter = (filter) => {
        setActiveFilter(filter);
        if (addNotification) {
            addNotification(`Filtre appliqué : ${filter}`, 'info');
        }
    };

    const handleEnroll = (courseId) => {
        if (addNotification) {
            addNotification('Inscription au cours réussie !', 'success');
        }
        navigate(`/course/${courseId}`);
    };

    const handleToggleFavorite = (courseId) => {
        setFavorites(prev => {
            const newFavorites = new Set(prev);
            if (newFavorites.has(courseId)) {
                newFavorites.delete(courseId);
                if (addNotification) {
                    addNotification('Retiré des favoris', 'info');
                }
            } else {
                newFavorites.add(courseId);
                if (addNotification) {
                    addNotification('Ajouté aux favoris ❤️', 'success');
                }
            }
            return newFavorites;
        });
    };

    return (
        <div className="learning-page">
            {/* Hero Section Améliorée */}
            <section className="hero-section" data-animate="hero">
                <div className="hero-background">
                    <div className="hero-particles">
                        {[...Array(20)].map((_, i) => (
                            <div key={i} className={`particle particle-${i % 4}`} />
                        ))}
                    </div>
                </div>
                
                <div className="hero-content">
                    <div className="hero-text">
                        <div className="hero-badge">
                            <FaTrophy />
                            <span>Plateforme #1 d'apprentissage mathématique</span>
                        </div>
                        
                        <h1>
                            <span className="gradient-text">Moderne, Puissant, Intelligent</span>
                            <br />
                            <span className="brand-highlight">Mathemann</span>
                        </h1>
                        
                        <p className="hero-description">
                            Découvrez une plateforme professionnelle et interactive pour les apprenants 
                            du monde entier. Cours personnalisés, outils engageants et accompagnement 
                            d'experts pour atteindre vos objectifs mathématiques.
                        </p>

                        <div className="hero-stats">
                            <div className="stat-item">
                                <AnimatedCounter target={15420} suffix="+" />
                                <span>Étudiants actifs</span>
                            </div>
                            <div className="stat-item">
                                <AnimatedCounter target={127} />
                                <span>Cours disponibles</span>
                            </div>
                            <div className="stat-item">
                                <AnimatedCounter target={94} suffix="%" />
                                <span>Taux de réussite</span>
                            </div>
                        </div>

                        <div className="hero-actions">
                            <button 
                                className="cta-button primary"
                                onClick={() => handleEnroll('demo')}
                            >
                                <FaRocket />
                                <span>Commencer gratuitement</span>
                            </button>
                            <button 
                                className="cta-button secondary"
                                onClick={() => document.querySelector('.courses-section').scrollIntoView({ behavior: 'smooth' })}
                            >
                                <FaPlay />
                                <span>Voir les cours</span>
                            </button>
                        </div>
                    </div>
                    
                    <div className="hero-visual">
                        <div className="hero-image-container">
                            <img
                                src="https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&h=400&fit=crop"
                                alt="Apprentissage sur Mathemann"
                                className="hero-image"
                            />
                            <div className="floating-elements">
                                <div className="floating-card card-1">
                                    <FaChartLine />
                                    <span>Progrès +89%</span>
                                </div>
                                <div className="floating-card card-2">
                                    <FaTrophy />
                                    <span>Certification</span>
                                </div>
                                <div className="floating-card card-3">
                                    <FaUsers />
                                    <span>15k+ Étudiants</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section de recherche et filtres */}
            <section className="search-section" data-animate="search">
                <SearchBar onSearch={handleSearch} onFilter={handleFilter} />
            </section>

            {/* Section des cours */}
            <section className="courses-section" data-animate="courses">
                <div className="section-header">
                    <h2>Cours Populaires</h2>
                    <p>Découvrez nos cours les plus appréciés par la communauté</p>
                </div>
                
                <div className="courses-grid">
                    {courses.map((course) => (
                        <CourseCard
                            key={course.id}
                            course={course}
                            onEnroll={handleEnroll}
                            isFavorite={favorites.has(course.id)}
                            onToggleFavorite={handleToggleFavorite}
                        />
                    ))}
                </div>
            </section>

            {/* Features Section Améliorée */}
            <section className="features-section" data-animate="features">
                <div className="section-header">
                    <h2>Pourquoi choisir Mathemann ?</h2>
                    <p>Découvrez les fonctionnalités qui font de notre plateforme un leader de l'éducation</p>
                </div>
                
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div 
                            className={`feature-card advanced ${visibleElements.has('features') ? 'animate-in' : ''}`}
                            key={index}
                            style={{ '--delay': `${index * 0.1}s`, '--color': feature.color }}
                        >
                            <div className="feature-icon" style={{ color: feature.color }}>
                                {feature.icon}
                                <div className="icon-background" style={{ backgroundColor: `${feature.color}20` }}></div>
                            </div>
                            <h3>{feature.title}</h3>
                            <p>{feature.description}</p>
                            <div className="feature-action">
                                <button className="learn-more-btn">
                                    En savoir plus
                                    <FaRocket />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Section statistiques */}
            <section className="stats-section" data-animate="stats">
                <div className="stats-container">
                    <h2>Mathemann en chiffres</h2>
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-icon">
                                <FaUsers />
                            </div>
                            <div className="stat-number">
                                <AnimatedCounter target={animatedStats.students} />
                            </div>
                            <div className="stat-label">Étudiants satisfaits</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <FaBookOpen />
                            </div>
                            <div className="stat-number">
                                <AnimatedCounter target={animatedStats.courses} />
                            </div>
                            <div className="stat-label">Cours disponibles</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <FaTrophy />
                            </div>
                            <div className="stat-number">
                                <AnimatedCounter target={animatedStats.completion} suffix="%" />
                            </div>
                            <div className="stat-label">Taux de réussite</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-icon">
                                <FaStar />
                            </div>
                            <div className="stat-number">
                                <AnimatedCounter target={animatedStats.satisfaction} suffix="%" />
                            </div>
                            <div className="stat-label">Satisfaction</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section témoignages */}
            <section className="testimonials-section" data-animate="testimonials">
                <div className="section-header">
                    <h2>Ce que disent nos étudiants</h2>
                    <p>Découvrez les retours de notre communauté d'apprenants</p>
                </div>
                
                <div className="testimonials-carousel">
                    <TestimonialCard testimonial={testimonials[currentTestimonial]} />
                    <div className="carousel-indicators">
                        {testimonials.map((_, index) => (
                            <button
                                key={index}
                                className={`indicator ${index === currentTestimonial ? 'active' : ''}`}
                                onClick={() => setCurrentTestimonial(index)}
                            />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA finale */}
            <section className="final-cta-section" data-animate="cta">
                <div className="cta-content">
                    <h2>Prêt à commencer votre parcours mathématique ?</h2>
                    <p>Rejoignez des milliers d'étudiants qui ont déjà transformé leur apprentissage avec Mathemann</p>
                    <div className="cta-actions">
                        <button 
                            className="cta-button primary large"
                            onClick={() => handleEnroll('signup')}
                        >
                            <FaRocket />
                            <span>Inscription gratuite</span>
                        </button>
                        <div className="cta-benefits">
                            <span>✓ Essai gratuit de 14 jours</span>
                            <span>✓ Accès à tous les cours</span>
                            <span>✓ Support 24/7</span>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Learning;