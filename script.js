document.addEventListener('DOMContentLoaded', () => {

    // --- تحديد كل العناصر ---
    const generateBtn = document.getElementById('generateBtn');
    const userInput = document.getElementById('userInput');
    const cvResult = document.getElementById('cvResult');
    const templateButtons = document.querySelectorAll('.template-btn');
    const downloadBtn = document.getElementById('downloadBtn');
    const translateSwitch = document.getElementById('translateSwitch');

    // --- حدث النقر على زر الإنشاء الرئيسي ---
    generateBtn.addEventListener('click', async () => {
        const userInputText = userInput.value;
        if (userInputText.trim() === '') {
            alert('الرجاء إدخال بياناتك في الصندوق أولاً.');
            return;
        }

        const shouldTranslate = translateSwitch.checked;

        generateBtn.disabled = true;
        generateBtn.textContent = 'جاري الإنشاء...';
        cvResult.innerHTML = '<div class="loading-spinner"></div><p class="placeholder-text">يتم الآن تحليل بياناتك بواسطة الذكاء الاصطناعي...</p>';

        try {
            const response = await fetch('https://mokhtar.pythonanywhere.com/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userInput: userInputText,
                    translate: shouldTranslate
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'حدث خطأ غير معروف.');

            const cvData = JSON.parse(data.cv_data);
            cvResult.dataset.cvData = JSON.stringify(cvData);
            renderCV(cvData, 'classic');

        } catch (error) {
            console.error("خطأ:", error);
            cvResult.innerHTML = `<p class="error-text">فشل إنشاء السيرة الذاتية. الخطأ: ${error.message}</p>`;
        } finally {
            generateBtn.disabled = false;
            generateBtn.textContent = 'أنشئ سيرتي الذاتية';
        }
    });

    // --- حدث النقر على أزرار اختيار القالب ---
    templateButtons.forEach(button => {
        button.addEventListener('click', () => {
            const templateName = button.dataset.template;
            const cvDataString = cvResult.dataset.cvData;
            if (cvDataString) {
                const cvData = JSON.parse(cvDataString);
                renderCV(cvData, templateName);
            } else {
                alert("يرجى إنشاء سيرة ذاتية أولاً.");
            }
        });
    });

    // --- حدث النقر على زر التحميل ---
    downloadBtn.addEventListener('click', () => {
        const cvDataString = cvResult.dataset.cvData;
        if (!cvDataString) {
            alert("يرجى إنشاء سيرة ذاتية أولاً قبل محاولة التحميل.");
            return;
        }
        const cvContent = document.getElementById('cvResult');
        const cvData = JSON.parse(cvDataString);
        const fileName = `CV-${cvData.personal_info.name.replace(/ /g, '_')}.pdf`;

        html2canvas(cvContent, { scale: 2, useCORS: true }).then(canvas => {
            const imgData = canvas.toDataURL('image/png');
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = pdfWidth / canvasWidth;

            pdf.addImage(imgData, 'PNG', 0, 0, canvasWidth * ratio, canvasHeight * ratio);
            pdf.save(fileName);
        });
    });

    // --- دالة العرض الرئيسية ---
    function renderCV(cvData, templateName) {
        let cvHTML = '';

        const name = cvData.personal_info?.name || '';
        const email = cvData.personal_info?.email || '';
        const phone = cvData.personal_info?.phone || '';
        const summary = cvData.summary || '';
        const experienceHTML = cvData.experience?.map(job => `<div class="cv-item"><h4><strong>${job.title}</strong> at ${job.company}</h4><em>${job.period}</em><p>${job.description}</p></div>`).join('') || '';
        const educationHTML = cvData.education?.map(edu => `<div class="cv-item"><h4><strong>${edu.degree}</strong></h4><p>${edu.institution} (${edu.year})</p></div>`).join('') || '';
        const skillsHTML = cvData.skills?.technical?.join(', ') || '';

        const isEnglish = /[a-zA-Z]/.test(name);
        const summaryTitle = isEnglish ? 'Professional Summary' : 'ملخص احترافي';
        const expTitle = isEnglish ? 'Work Experience' : 'الخبرة العملية';
        const eduTitle = isEnglish ? 'Education' : 'التعليم';
        const skillsTitle = isEnglish ? 'Skills' : 'المهارات';
        const contactTitle = isEnglish ? 'Contact' : 'التواصل';
        const techSkillsTitle = isEnglish ? 'Technical Skills' : 'مهارات تقنية';

        if (templateName === 'classic') {
            cvHTML = `
                <div class="cv-header"><h2>${name}</h2><p>${email} | ${phone}</p></div>
                <div class="cv-section"><h3>${summaryTitle}</h3><p>${summary}</p></div>
                <div class="cv-section"><h3>${expTitle}</h3>${experienceHTML}</div>
                <div class="cv-section"><h3>${eduTitle}</h3>${educationHTML}</div>
                <div class="cv-section"><h3>${skillsTitle}</h3><p><strong>${techSkillsTitle}:</strong> ${skillsHTML}</p></div>
            `;
        } else if (templateName === 'modern') {
            cvHTML = `
                <div class="cv-sidebar">
                    <div class="cv-header"><h2>${name}</h2></div>
                    <div class="cv-section"><h3>${contactTitle}</h3><p>${email}<br>${phone}</p></div>
                    <div class="cv-section"><h3>${skillsTitle}</h3><p>${cvData.skills?.technical?.join('<br>') || ''}</p></div>
                </div>
                <div class="cv-main">
                    <div class="cv-section"><h3>${summaryTitle}</h3><p>${summary}</p></div>
                    <div class="cv-section"><h3>${expTitle}</h3>${experienceHTML}</div>
                    <div class="cv-section"><h3>${eduTitle}</h3>${educationHTML}</div>
                </div>
            `;
        }

        cvResult.innerHTML = cvHTML;
        cvResult.className = 'cv-preview';
        cvResult.classList.add(templateName);
        cvResult.style.direction = isEnglish ? 'ltr' : 'rtl';
    }
});