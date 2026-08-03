const burger=document.querySelector('.burger');
const mobileMenu=document.querySelector('.mobile-menu');
burger?.addEventListener('click',()=>mobileMenu.classList.toggle('open'));
mobileMenu?.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>mobileMenu.classList.remove('open')));
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('visible');observer.unobserve(entry.target)}}),{threshold:.12});
document.querySelectorAll('.reveal').forEach(el=>observer.observe(el));


const applicationForm=document.querySelector('#applicationForm');
applicationForm?.addEventListener('submit',(event)=>{
  event.preventDefault();
  const name=document.querySelector('#clientName').value.trim();
  const interest=document.querySelector('#clientInterest').value;
  const message=document.querySelector('#clientMessage').value.trim();
  const text=`Здравствуйте! Меня зовут ${name}. Меня интересует: ${interest}. Мой запрос: ${message}`;
  window.open(`https://wa.me/77019289030?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
});
