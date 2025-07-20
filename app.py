import os
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# --- الإعدادات الأولية ---
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError(
        "لم يتم العثور على مفتاح GEMINI_API_KEY. تأكد من وجود ملف .env صحيح."
    )

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-1.5-flash")
app = Flask(__name__)
CORS(app)


# --- نقطة النهاية (Endpoint) ---
@app.route("/generate-cv", methods=["POST"])
def generate_cv_route():
    if not request.is_json:
        return jsonify({"error": "الطلب يجب أن يكون بصيغة JSON"}), 400

    data = request.get_json()
    user_text = data.get("userInput")
    translate_to_english = data.get("translate", False)

    if not user_text:
        return jsonify({"error": "لم يتم إرسال أي نص"}), 400

    # --- اختيار الأمر (Prompt) بناءً على طلب الترجمة ---
    if translate_to_english:
        # أمر جديد للترجمة إلى الإنجليزية
        prompt = f"""
        Your mission is to act as an expert international HR professional specializing in CV writing.
        You will be given unstructured text in ARABIC containing a person's professional information.
        Your task is to analyze this Arabic text, professionally TRANSLATE its content into high-quality ENGLISH, organize it, and return the output STRICTLY in a valid JSON format.

        The user's input text (in Arabic):
        ---
        {user_text}
        ---

        Instructions:
        1.  **Personal Info (personal_info):** Extract and translate the name (name), email, phone, and LinkedIn profile URL if available.
        2.  **Professional Summary (summary):** Based on your understanding of the entire text, write a compelling professional summary in English (2-3 sentences).
        3.  **Work Experience (experience):** For each job, identify and translate the job title (title), company name (company), and location/period (period). Most importantly, rewrite the responsibilities (description) into concise, powerful bullet points in English, starting with action verbs (e.g., "Managed," "Developed," "Increased").
        4.  **Education (education):** For each degree, extract and translate the degree name (degree), institution name (institution), and graduation year (year).
        5.  **Skills (skills):** Extract the mentioned skills, translate them, and categorize them into technical and soft skills.

        Your final output must be a valid JSON object with the exact following structure. Do not add any extra text or markdown formatting around the JSON.
        {{
          "personal_info": {{ "name": "...", "email": "...", "phone": "..." }},
          "summary": "...",
          "experience": [ {{ "title": "...", "company": "...", "period": "...", "description": "..." }} ],
          "education": [ {{ "degree": "...", "institution": "...", "year": "..." }} ],
          "skills": {{ "technical": [], "soft": [] }}
        }}
        """
    else:
        # الأمر الأصلي باللغة العربية
        prompt = f"""
        مهمتك هي العمل كخبير موارد بشرية محترف ومتخصص في كتابة السير الذاتية (CV).
        سأعطيك نصًا عربيًا غير منظم. عليك تحليل هذا النص، تنظيمه، وإعادة صياغة بعض الأجزاء لتبدو أكثر احترافية، ثم إرجاع الناتج **حصراً** بصيغة JSON.
        النص المدخل: --- {user_text} ---
        التعليمات: استخرج المعلومات الشخصية، الخبرة العملية (أعد صياغة المهام كنقاط موجزة تبدأ بأفعال قوية)، التعليم، والمهارات. اكتب ملخصًا احترافيًا من سطرين.
        يجب أن يكون ناتجك النهائي عبارة عن كائن JSON صالح للاستخدام مباشرة، بالهيكل التالي بالضبط:
        {{
          "personal_info": {{ "name": "...", "email": "...", "phone": "..." }},
          "summary": "...",
          "experience": [ {{ "title": "...", "company": "...", "period": "...", "description": "..." }} ],
          "education": [ {{ "degree": "...", "institution": "...", "year": "..." }} ],
          "skills": {{ "technical": [], "soft": [] }}
        }}
        """

    try:
        response = model.generate_content(prompt)
        # تنظيف الرد من أي علامات إضافية قد يضعها النموذج
        cleaned_response = (
            response.text.strip().replace("```json", "").replace("```", "")
        )
        return jsonify({"cv_data": cleaned_response})
    except Exception as e:
        print(f"حدث خطأ: {e}")
        return (
            jsonify(
                {
                    "error": "حدث خطأ أثناء التواصل مع الذكاء الاصطناعي. الرجاء المحاولة مرة أخرى."
                }
            ),
            500,
        )


if __name__ == "__main__":
    app.run(port=5001)
