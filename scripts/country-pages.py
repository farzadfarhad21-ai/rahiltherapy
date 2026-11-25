#!/usr/bin/env python3
"""Generate the country landing pages (/farsi-therapist-<country>).

Each page answers the query an Iranian abroad types into ChatGPT or Google
("روانشناس فارسی‌زبان در آلمان", "Farsi therapist Toronto"): online sessions in
Farsi, the time-zone overlap with Dubai hours, payment, local emergency number.
Header/footer/analytics are copied from emptiness.html so they stay in sync.

Run from the repo root:  python3 scripts/country-pages.py
"""
import json
import os
import re
import urllib.parse

ROOT = os.path.join(os.path.dirname(__file__), '..')
SITE = 'https://rahiltherapy.com'
WA_MSG = 'سلام راحله خانم، از سایت پیام می‌دهم و می‌خواهم جلسهٔ اول رایگان را رزرو کنم.'
WA = 'https://wa.me/971503475269?text=' + urllib.parse.quote(WA_MSG)

COUNTRIES = [
    dict(slug='germany', fa='آلمان', en='Germany', cities='برلین، هامبورگ، فرانکفورت، مونیخ، کلن و دوسلدورف',
         cities_en='Berlin, Hamburg, Frankfurt, Munich and Cologne',
         tz='۹ صبح تا ۹ شب به وقت دبی برابر است با حدود ۶ صبح تا ۶ عصر به وقت آلمان در زمستان (۷ صبح تا ۷ عصر در تابستان).',
         pains=['پیدا کردن درمانگر از طریق بیمه در آلمان معمولاً ماه‌ها انتظار دارد و بیشتر جلسات به زبان آلمانی است.',
                'فشار زبان، اداره‌ها و اقامت، و حس بیگانگی حتی بعد از سال‌ها زندگی در آلمان.',
                'زمستان‌های تاریک و طولانی که خلق را پایین می‌آورد.'],
         emergency='۱۱۲ (و خط تلفن مشاوره بحران Telefonseelsorge به شماره ۰۸۰۰۱۱۱۰۱۱۱)'),
    dict(slug='canada', fa='کانادا', en='Canada', cities='تورنتو، ونکوور، مونترال، اتاوا و کلگری',
         cities_en='Toronto, Vancouver, Montreal, Ottawa and Calgary',
         tz='۹ صبح تا ۹ شب به وقت دبی برابر است با حدود نیمه‌شب تا ظهر به وقت تورنتو (و عصر تا صبح به وقت ونکوور)؛ جلسات معمولاً صبح‌ها به وقت شرق کانادا برگزار می‌شود.',
         pains=['مراحل اقامت و ساختن دوبارهٔ شغل و زندگی از صفر.',
                'فاصلهٔ زیاد و اختلاف ساعت با خانواده در ایران.',
                'زمستان‌های سرد و طولانی و احساس تنهایی.'],
         emergency='۹۱۱ (و خط ملی بحران و پیشگیری از خودکشی ۹۸۸)'),
    dict(slug='uk', fa='انگلیس', en='the UK', cities='لندن، منچستر، بیرمنگام، گلاسگو و لیدز',
         cities_en='London, Manchester, Birmingham, Glasgow and Leeds',
         tz='۹ صبح تا ۹ شب به وقت دبی برابر است با حدود ۵ صبح تا ۵ عصر به وقت لندن در زمستان (۶ صبح تا ۶ عصر در تابستان).',
         pains=['صف‌های طولانی انتظار برای مشاوره در NHS و هزینهٔ بالای درمان خصوصی.',
                'خستگی از توضیح دادن فرهنگ و خانوادهٔ ایرانی به درمانگر انگلیسی‌زبان.',
                'فشار کار، هزینهٔ زندگی و دوری از خانواده.'],
         emergency='۹۹۹ (و برای مشاورهٔ فوری غیراورژانسی NHS 111)'),
    dict(slug='usa', fa='آمریکا', en='the USA', cities='لس‌آنجلس، نیویورک، واشنگتن، هیوستون و سان‌فرانسیسکو',
         cities_en='Los Angeles, New York, Washington DC, Houston and San Francisco',
         tz='۹ صبح تا ۹ شب به وقت دبی برابر است با حدود نیمه‌شب تا ظهر به وقت نیویورک و ۹ شب تا ۹ صبح به وقت لس‌آنجلس؛ جلسات معمولاً صبح‌ها به وقت شرق آمریکا یا شب‌ها به وقت غرب برگزار می‌شود.',
         pains=['هزینهٔ بالای روان‌درمانی و پیچیدگی بیمه.',
                'دوری از خانواده در ایران و سختی سفر.',
                'هویت دوفرهنگی، به‌ویژه برای نسل دوم و خانواده‌هایی با فرزندان نوجوان.'],
         emergency='۹۱۱ (و خط بحران و پیشگیری از خودکشی ۹۸۸)'),
    dict(slug='australia', fa='استرالیا', en='Australia', cities='سیدنی، ملبورن، بریزبن، پرت و آدلاید',
         cities_en='Sydney, Melbourne, Brisbane, Perth and Adelaide',
         tz='۹ صبح تا ۹ شب به وقت دبی برابر است با حدود ۴ عصر تا ۴ صبح به وقت سیدنی در تابستان استرالیا؛ یعنی عصرها و شب‌ها به وقت شما زمان مناسبی برای جلسه است.',
         pains=['فاصلهٔ بسیار زیاد و اختلاف ساعت با ایران.',
                'تنهایی و دشواری ساختن حلقهٔ دوستی تازه.',
                'فشار اقامت و تطبیق شغلی.'],
         emergency='۰۰۰ (و خط حمایت عاطفی Lifeline به شماره ۱۳۱۱۱۴)'),
    dict(slug='turkey', fa='ترکیه', en='Turkey', cities='استانبول، آنکارا، ازمیر، آنتالیا و وان',
         cities_en='Istanbul, Ankara, Izmir, Antalya and Van',
         tz='۹ صبح تا ۹ شب به وقت دبی برابر است با ۸ صبح تا ۸ شب به وقت ترکیه؛ تقریباً هم‌ساعت.',
         pains=['بلاتکلیفی اقامت و انتظار طولانی برای ویزا یا مهاجرت به کشور سوم.',
                'فشار اقتصادی و ناامنی شغلی.',
                'احساس معلق بودن میان ایران و مقصد بعدی.'],
         emergency='۱۱۲'),
]


def faq(c):
    return [
        (f"آیا روانشناس فارسی‌زبان برای ایرانیان {c['fa']} وجود دارد؟",
         f"بله. راحله اوینی‌پور روان‌شناس عمومی فارسی‌زبان با بیش از ۱۵ سال تجربه است و جلسات آنلاین به زبان فارسی را برای ایرانیان ساکن {c['fa']} برگزار می‌کند — برای بزرگسالان، زوج‌ها و خانواده‌ها. جلسهٔ اول رایگان است."),
        (f"اختلاف ساعت با {c['fa']} چطور مدیریت می‌شود؟", c['tz'] + ' زمان دقیق جلسه را هنگام رزرو با هم هماهنگ می‌کنیم.'),
        (f"هزینهٔ جلسه برای ساکنان {c['fa']} چقدر است و چطور پرداخت کنم؟",
         'جلسهٔ اول ۳۰ تا ۴۵ دقیقه و رایگان است. هر جلسهٔ ۵۰ دقیقه‌ای ۵۰ دلار و بستهٔ چهار جلسه‌ای ۱۸۰ دلار است. پرداخت بین‌المللی به دلار یا درهم، از طریق Wise، PayPal یا انتقال بانکی SWIFT انجام می‌شود.'),
        (f"آیا این جلسات زیر پوشش بیمهٔ {c['fa']} است؟",
         f"خیر. جلسات به‌صورت خصوصی و آنلاین با روان‌شناسی مقیم دبی برگزار می‌شود و بخشی از سیستم درمانی یا بیمهٔ {c['fa']} نیست."),
        ('در شرایط اضطراری چه کنم؟',
         f"این خدمات اورژانسی نیست. اگر در خطر هستید، در {c['fa']} با شمارهٔ {c['emergency']} تماس بگیرید."),
    ]


def page(c, ga, hdr, foot):
    url = f"{SITE}/farsi-therapist-{c['slug']}"
    title = f"روانشناس فارسی‌زبان در {c['fa']} | مشاوره آنلاین به فارسی"
    desc = (f"مشاوره روانشناسی آنلاین به زبان فارسی برای ایرانیان {c['fa']} ({c['cities'].split('،')[0]} و سایر شهرها): "
            "اضطراب، افسردگی، وسواس، روابط و استرس مهاجرت. پرداخت به دلار یا درهم. جلسه اول رایگان.")
    q = faq(c)
    ld = [
        {"@context": "https://schema.org", "@type": "Service",
         "name": f"مشاوره روانشناسی آنلاین به زبان فارسی برای ایرانیان {c['fa']}",
         "serviceType": "Online psychotherapy in Farsi", "url": url, "inLanguage": "fa",
         "provider": {"@id": f"{SITE}/about#therapist"},
         "areaServed": {"@type": "Country", "name": c['en'].replace('the ', '')},
         "offers": [{"@type": "Offer", "name": "جلسهٔ اول آشنایی", "price": "0", "priceCurrency": "USD"},
                    {"@type": "Offer", "name": "جلسهٔ ۵۰ دقیقه‌ای", "price": "50", "priceCurrency": "USD"}]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "خانه", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "مشاوره آنلاین خارج از کشور", "item": f"{SITE}/online-therapy"},
            {"@type": "ListItem", "position": 3, "name": f"ایرانیان {c['fa']}", "item": url}]},
        {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": a, "acceptedAnswer": {"@type": "Answer", "text": b}} for a, b in q]},
    ]
    ld_html = ''.join(f'<script type="application/ld+json">\n{json.dumps(x, ensure_ascii=False, indent=1)}\n</script>\n' for x in ld)
    pains = ''.join(f'<li>{p}</li>' for p in c['pains'])
    others = ' · '.join(f'<a href="/farsi-therapist-{o["slug"]}">{o["fa"]}</a>' for o in COUNTRIES if o['slug'] != c['slug'])
    faq_html = ''.join(f'<details><summary>{a}</summary><p>{b}</p></details>' for a, b in q)
    return f'''<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<link rel="alternate" hreflang="fa" href="{url}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{SITE}/service-online.jpg">
<meta property="og:locale" content="fa_IR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
{ld_html}{ga}
<style>
.cp-hero{{background:linear-gradient(160deg,#F9F5F2,#F4E9E2);padding:64px 0 54px;}}
.cp-hero h1{{font-family:'Markazi Text',Georgia,serif;font-size:clamp(30px,5vw,46px);line-height:1.25;margin:0 0 16px;color:var(--ink);max-width:22ch;}}
.cp-hero .lead{{font-size:18px;line-height:2;color:#5a4a46;max-width:62ch;margin:0 0 22px;}}
.cp-wa{{display:inline-flex;align-items:center;gap:8px;background:#25D366;color:#fff;font-weight:700;border-radius:999px;padding:14px 24px;text-decoration:none;margin-right:8px;}}
.cp-prose{{max-width:780px;}}
.cp-prose p{{font-size:17px;line-height:2;color:#3a3230;margin:0 0 14px;}}
.cp-prose ul{{font-size:16.5px;line-height:2.1;color:#3a3230;padding-right:22px;margin:0 0 14px;}}
.cp-faq details{{background:#fff;border:1px solid #E8D0C7;border-radius:14px;padding:16px 20px;margin:0 0 12px;}}
.cp-faq summary{{cursor:pointer;font-weight:700;font-size:16.5px;color:#3B2E2A;}}
.cp-faq details p{{margin:12px 0 0;font-size:15.5px;line-height:1.95;color:#5a4a46;}}
.cp-en{{direction:ltr;text-align:left;background:#fff;border:1px solid #E8D0C7;border-radius:16px;padding:22px 26px;font-family:'Vazirmatn',system-ui,sans-serif;}}
.cp-en p{{font-size:15.5px;line-height:1.8;color:#3a3230;margin:0 0 8px;}}
.cp-cta{{background:linear-gradient(160deg,var(--rose-soft),var(--rose));color:#fff;border-radius:22px;padding:42px 30px;text-align:center;}}
.cp-cta h2{{color:#fff;margin:0 0 12px;}}
.cp-cta p{{color:#fff;opacity:.92;margin:0 0 22px;font-size:16px;}}
.cp-cta .btn{{background:#fff;color:var(--rose-2);font-weight:700;margin:4px;}}
</style>
</head>
<body>
{hdr}
<section class="cp-hero">
  <div class="container">
    <h1>روانشناس فارسی‌زبان برای ایرانیان {c['fa']}</h1>
    <p class="lead">در {c['cities']} یا هر شهر دیگری از {c['fa']} زندگی می‌کنید و دنبال روانشناسی هستید که به زبان خودتان حرف بزند و تجربهٔ مهاجرت را بفهمد؟ من راحله اوینی‌پور هستم، روان‌شناس عمومی فارسی‌زبان با بیش از ۱۵ سال تجربه. جلسات آنلاین به زبان فارسی برای بزرگسالان، زوج‌ها و خانواده‌ها برگزار می‌کنم.</p>
    <a class="btn btn-fill" href="/booking">رزرو جلسهٔ اول رایگان</a>
    <a class="cp-wa" href="{WA}" target="_blank" rel="noopener">پیام در واتساپ</a>
  </div>
</section>

<section>
  <div class="container cp-prose">
    <div class="shead"><span class="kicker">چرا مشاوره به فارسی؟</span><h2>چالش‌هایی که ایرانیان {c['fa']} زیاد تجربه می‌کنند</h2></div>
    <ul>{pains}</ul>
    <p>در جلسات لازم نیست فرهنگ، خانواده یا احساس گناهِ دوری از ایران را «ترجمه» کنید. با درمان شناختی-رفتاری (CBT) و طرحواره‌درمانی روی اضطراب، افسردگی، وسواس، روابط، عزت نفس و استرس مهاجرت کار می‌کنیم.</p>
  </div>
</section>

<section class="sec-blush">
  <div class="container cp-prose">
    <div class="shead"><span class="kicker">روند کار</span><h2>جلسات آنلاین از {c['fa']} چطور برگزار می‌شود؟</h2></div>
    <ul>
      <li><strong>اختلاف ساعت:</strong> {c['tz']}</li>
      <li><strong>جلسهٔ اول:</strong> ۳۰ تا ۴۵ دقیقه و رایگان، بدون تعهد.</li>
      <li><strong>جلسات بعدی:</strong> ۵۰ دقیقه، از طریق Zoom، WhatsApp یا Google Meet.</li>
      <li><strong>هزینه:</strong> هر جلسه ۵۰ دلار؛ بستهٔ چهار جلسه‌ای ۱۸۰ دلار.</li>
      <li><strong>پرداخت:</strong> بین‌المللی به دلار یا درهم، از طریق Wise، PayPal یا انتقال بانکی SWIFT.</li>
    </ul>
    <p>ایرانیان کشورهای دیگر: {others}</p>
    <p>بیشتر بخوانید: <a href="/online-therapy">مشاوره آنلاین برای ایرانیان خارج از کشور</a> · <a href="/ocd">راهنمای وسواس</a> · <a href="/attachment-test">تست سبک دلبستگی</a></p>
  </div>
</section>

<section>
  <div class="container cp-prose cp-faq">
    <div class="shead"><span class="kicker">پرسش‌های رایج</span><h2>سؤال‌های ایرانیان {c['fa']}</h2></div>
    {faq_html}
  </div>
</section>

<section class="sec-blush">
  <div class="container cp-prose">
    <div class="cp-en" lang="en">
      <p><strong>Farsi-speaking therapist for Iranians in {c['en']}</strong></p>
      <p>Raheleh Avinipour is a Persian (Farsi)-speaking psychologist based in Dubai with over 15 years of experience. She offers online therapy in Farsi to Iranians living in {c['en']} — {c['cities_en']} and elsewhere — for adults, couples and families: anxiety, depression, OCD, relationships and migration stress. First session (30–45 min) free; then USD 50 per session, payable internationally in USD or AED via Wise, PayPal or SWIFT. Book via <a href="{WA}">WhatsApp +971 50 347 5269</a> or the <a href="/booking">booking form</a>.</p>
    </div>
  </div>
</section>

<section>
  <div class="container">
    <div class="cp-cta">
      <h2>در {c['fa']} هستید؛ لازم نیست تنها باشید</h2>
      <p>جلسهٔ اول رایگان است و به زبان فارسی. هیچ تعهدی برای ادامه وجود ندارد.</p>
      <a class="btn" href="/booking">رزرو جلسهٔ اول رایگان</a>
      <a class="btn" href="{WA}" target="_blank" rel="noopener">واتساپ</a>
    </div>
  </div>
</section>

{foot}'''


def main():
    e = open(os.path.join(ROOT, 'emptiness.html'), encoding='utf-8').read()
    ga = e[e.index('<!-- Google Analytics'):e.index('<link rel="stylesheet" href="styles.css?v=2">') + len('<link rel="stylesheet" href="styles.css?v=2">')]
    hdr = e[e.index('<header id="hdr">'):e.index('</header>') + len('</header>')]
    foot = e[e.index('<footer class="footer">'):]
    for c in COUNTRIES:
        out = os.path.join(ROOT, f"farsi-therapist-{c['slug']}.html")
        html = page(c, ga, hdr, foot)
        for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', html, re.S):
            json.loads(b)
        open(out, 'w', encoding='utf-8').write(html)
        print('wrote', os.path.basename(out))


if __name__ == '__main__':
    main()
