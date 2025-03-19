// Main JavaScript file for general functionality
document.addEventListener('DOMContentLoaded', function() {
    // Handle contact form submission
    const contactForm = document.getElementById('contact-form');
    const formResponse = document.getElementById('form-response');
    
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Simple form validation
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const subject = document.getElementById('subject').value;
            const message = document.getElementById('message').value;
            
            if (name && email && subject && message) {
                // In a real application, you would send the form data to a server
                // For this assignment, we'll just show a success message
                formResponse.textContent = 'Thank you for your message. We will get back to you soon!';
                formResponse.classList.add('success');
                contactForm.reset();
                
                // Reset the form response message after 5 seconds
                setTimeout(() => {
                    formResponse.textContent = '';
                    formResponse.classList.remove('success');
                }, 5000);
            } else {
                formResponse.textContent = 'Please fill in all fields.';
                formResponse.classList.add('error');
                
                // Reset the form response message after 3 seconds
                setTimeout(() => {
                    formResponse.textContent = '';
                    formResponse.classList.remove('error');
                }, 3000);
            }
        });
    }
    
    // Add smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId !== '#') {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // Add active class to current page in navigation
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = document.querySelectorAll('nav ul li a');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('href');
        if (
            (currentPage === '' && linkPage === 'index.html') ||
            linkPage === currentPage
        ) {
            link.classList.add('active');
        }
    });
});