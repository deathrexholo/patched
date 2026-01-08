document.addEventListener('DOMContentLoaded', function() {
    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate');
            }
        });
    }, observerOptions);

    // Observe elements with animation classes
    document.querySelectorAll('.title span, .subtitle, .cta-button, .testimonial-card').forEach(el => {
        observer.observe(el);
    });

    // Handle hero image fade out on scroll
    const heroImage = document.querySelector('.hero-image');
    const heroSection = document.querySelector('.content');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const heroHeight = heroSection.offsetHeight;
        
        // Fade out hero image when scrolling down
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            // Scrolling down
            document.body.classList.add('scrolled');
        } else if (scrollTop <= 100) {
            // At the top of the page
            document.body.classList.remove('scrolled');
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
    }, false);

    // Smooth scroll for buttons
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Add animation class to elements on load
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);

    // Handle window resize to adjust hero image
    function handleResize() {
        if (window.innerWidth <= 768) {
            heroImage.style.position = 'relative';
            heroImage.style.width = '100%';
            heroImage.style.height = 'auto';
        } else {
            heroImage.style.position = 'fixed';
            heroImage.style.width = '50%';
            heroImage.style.height = '100vh';
        }
    }

    // Initial call
    handleResize();
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
});
