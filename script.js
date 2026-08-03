const burger=document.querySelector('.burger');
const mobileMenu=document.querySelector('.mobile-menu');
burger?.addEventListener('click',()=>mobileMenu.classList.toggle('open'));
mobileMenu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>mobileMenu.classList.remove('open')));
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));
