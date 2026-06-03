/**
 * instagram-content.js
 * Generates 7 days of Instagram captions and saves to instagram-schedule.md
 * Topics rotate daily in sync with blog automation (same order)
 *
 * Usage: node instagram-content.js
 */

const fs = require('fs');
const path = require('path');

const TOPICS = [
  'اضطراب',
  'افسردگی',
  'روابط',
  'عزت نفس',
  'طرحواره درمانی',
  'OCD',
  'رشد فردی',
  'والدین',
  'ADHD',
  'ذهن‌آگاهی'
];

const WHATSAPP = '989124228995';

const CAPTION_TEMPLATES = {
  'اضطراب': {
    hooks: [
      '😰 آیا ذهنت همیشه در حال پرش است؟',
      '💭 وقتی نگرانی‌ها تمامی‌ناپذیرند...',
      '🧠 چرا باید هر روز با یک فکر جدید بیدار شوی؟'
    ]
  },
  'افسردگی': {
    hooks: [
      '💔 گاهی "خوبم" یعنی هنوز زنده‌ام.',
      '🖤 افسردگی یعنی خسته شدن از خودت.',
      '😔 این حس را فقط کسی درک می‌کند که تجربه کرده.'
    ]
  },
  'روابط': {
    hooks: [
      '💕 چرا بعضی آدم‌ها همیشه تو را عصبانی می‌کنند؟',
      '🌿 مرز گذاشتن یعنی عاشقانه زندگی کردن.',
      '🤍 کسی که تو را در ضعیف‌ترین حالتت ببیند و بماند.'
    ]
  },
  'عزت نفس': {
    hooks: [
      '💛 اگر خودت را دوست نداشته باشی، کسی دیگر هم این کار را نمی‌کند.',
      '🦋 چرا همیشه منتظر تأیید دیگرانی؟',
      '💔 زخمی‌ترین جمله‌ای که یک نفر می‌تواند بشنود: "تو به اندازه کافی خوب نیستی."'
    ]
  },
  'طرحواره درمانی': {
    hooks: [
      '🧩 آیا بعضی از الگوهای زندگی‌ات تکراری و خسته‌کننده‌اند؟',
      '🔁 چرا در روابط عاطفی همیشه یکسان آسیب می‌بینی؟',
      '👶 بعضی باورها از بچگی با ما رشد می‌کنند و ما هنوز داریم با آن‌ها زندگی می‌کنیم.'
    ]
  },
  'OCD': {
    hooks: [
      '🔄 ذهنت وسواسی: وقتی فکر وارد می‌شود و رها نمی‌کند.',
      '🧠 آیا می‌دانی وسواس فکری فقط مربوط به تمیزی نیست؟',
      '🚪 چرا باید هر شب چند بار چک کنی در را؟'
    ]
  },
  'رشد فردی': {
    hooks: [
      '🌱 بزرگ‌ترین سفر، سفر درونی است.',
      '🚀 چرا هنوز هم از تغییر می‌ترسی؟',
      '✨ زندگی بدون خودشناسی فقط یک عبور بی‌هدف است.'
    ]
  },
  'والدین': {
    hooks: [
      '👶 کودکان نیاز دارند نه فقط دیده شوند، بلکه شنیده شوند.',
      '🗣️ آیا می‌دانی بیشترین تأثیر روی فرزندت را لحن صدایت دارد نه کلماتت؟',
      '💝 وقتی فرزندت گریه می‌کند، اول کلافگی‌اش را بشنو، بعد حرفش را.'
    ]
  },
  'ADHD': {
    hooks: [
      '⚡ ذهنت ADHD یعنی همیشه چند فکر همزمان در سر.',
      '🎯 آیا تمام تمرکز تو در دقیقه اول یک کار تمام می‌شود؟',
      '🧠 بیشتر آدم‌های باهوش دنیا ADHD داشته‌اند.'
    ]
  },
  'ذهن‌آگاهی': {
    hooks: [
      '🧘‍♀️ ذهن‌آگاهی یعنی در لحظه زندگی کنی، نه در گذشته یا آینده.',
      '🌸 هر ۵ نفس عمیق، یک قدم به آرامش.',
      '☀️ چرا نمی‌توانی یک دقیقه فقط بشینی و باشی؟'
    ]
  }
};

function getTopicForDay(dayOffset) {
  const today = new Date();
  today.setDate(today.getDate() + dayOffset);
  const dayIndex = Math.floor(today.getTime() / 86400000) % TOPICS.length;
  return TOPICS[dayIndex];
}

function generateCaption(topic, date) {
  const templates = CAPTION_TEMPLATES[topic];
  const hook = templates?.hooks[Math.floor(Math.random() * templates?.hooks.length)] || `امروز درباره ${topic} صحبت می‌کنیم.`;

  const valueLines = {
    'اضطراب': [
      '💭 گاهی اضطراب اینقدر ظریف وارد زندگی می‌شود که فکر می‌کنیم "استرس عادی" است.',
      '🌙 اما وقتی هر شب با فکر "نکند اتفاق بدی بیفتد" بیدار می‌شوی...',
      '❤️‍🔥 یا وقتی قلبت بدون دلیل تند می‌زند و نمی‌فهمی چرا.',
      '✅ این نشانه‌ها مهم‌اند. و مهم‌تر از آن، درمان‌پذیرند.'
    ],
    'افسردگی': [
      '🖤 افسردگی فقط "غم و غصه" نیست. گاهی یعنی خالی بودن از هر انگیزه.',
      '☁️ وقتی صبح از خواب بیدار می‌شوی و انرژی‌ای برای بلند شدن نداری.',
      '🎐 یا وقتی حتی کارهایی که زمانی دوست داشتی، حالا بی‌معنی به نظر می‌رسند.',
      '🔔 این احساس، مهم‌ترین نشانه است که باید به آن گوش بدهی.'
    ],
    'روابط': [
      '🔋 بعضی آدم‌ها انرژی می‌گیرند و بعضی انرژی می‌دهند.',
      '⚠️ کسی که دائماً تو را کوچک می‌کند، حتی اگر "عشقم" باشد، سمّ است.',
      '🌿 مرز گذاشتن خودخواهی نیست. مرز گذاشتن عشق به خودت است.',
      '💎 یادت باشد: نباید برای کسی نیاز به فداکاری برای کسی.'
    ],
    'عزت نفس': [
      '💛 عزت نفس یعنی باور به ارزش خودت، بدون توجه به نتیجه.',
      '🪞 کسی که دائماً خودش را با دیگران مقایسه می‌کند، در حال از دست دادن خودش است.',
      '💔 هر بار که به خودت می‌گویی "نمی‌توانم"، داری یک قطعه از خودت را می‌شکنی.',
      '🌱 اولین قدم برای ساختن عزت نفس: شناخت افکار منفی و به چالش کشیدنشان.'
    ],
    'طرحواره درمانی': [
      '🧩 طرحواره‌ها باورهای عمیقی هستند که از کودکی شکل گرفته‌اند.',
      '👶 مثلاً "من不值得愛" یا "دنیا امن نیست" یا "باید کامل باشم".',
      '🔗 این باورها رفتار ما را در روابط، کار و زندگی شکل می‌دهند.',
      '🛠️ طرحواره درمانی به شما کمک می‌کند این الگوها را بشناسید و تغییر دهید.'
    ],
    'OCD': [
      '🔄 OCD فقط وسواس تمیزی نیست. گاهی وسواس فکری است.',
      '💭 مثل فکرهایی که ناخواسته می‌آیند و نمی‌روند.',
      '🔁 یا نیاز شدید به بررسی مکرر چیزها، حتی وقتی می‌دانی درست است.',
      '🤝 OCD درمان دارد. و اولین قدم، پذیرش است نه خجالت.'
    ],
    'رشد فردی': [
      '🌱 رشد فردی یعنی مسئولیتِ تغییرِ خودت را بپذیری.',
      '🚫 هیچ‌کس قرار نیست بیاید و زندگی‌ات را نجات دهد.',
      '✨ اما وقتی تصمیم می‌گیری روی خودت کار کنی، همه چیز تغییر می‌کند.',
      '🌅 هر روز یک فرصت برای نسخه بهتری از خودت شدن است.'
    ],
    'والدین': [
      '👶 کودکان از ما یاد می‌گیرند، نه از نصیحت‌هایمان.',
      '👂 وقتی فرزندت ناراحت است، اول احساسش را بشنو.',
      '💬 بگو: "می‌فهمم که ناراحتی" - نه "چیزی نیست، نباش!"',
      '🏰 این کار ساده، پایه اعتماد را در فرزندت می‌سازد.'
    ],
    'ADHD': [
      '⚡ ADHD فقط بی‌توجهی نیست. یعنی ذهنت سریع‌تر از زبانت فکر می‌کند.',
      '🎨 افراد ADHD اغلب خلاقیت بالا و توانایی تفکر چندمسیره دارند.',
      '📋 چالش اصلی: سازماندهی و تمرکز، نه هوش.',
      '💡 با راهبردهای درست، ADHD می‌تواند نقطه قوت باشد.'
    ],
    'ذهن‌آگاهی': [
      '🧘‍♀️ ذهن‌آگاهی یعنی بدون قضاوت، به لحظه حال نگاه کنی.',
      '🌬️ هر بار که ذهنت به گذشته یا آینده می‌رود، نفس عمیق بکش.',
      '⏰ ۵ دقیقه مدیتیشن در روز، تغییر بزرگی در کیفیت زندگی ایجاد می‌کند.',
      '💪 ذهن مثل عضله است - نیاز به تمرین دارد.'
    ]
  };

  const lines = valueLines[topic] || [
    `امروز درباره ${topic} بیشتر صحبت می‌کنیم.`,
    'این موضوع در زندگی روزمره خیلی از ما تأثیر دارد.',
    'اگر می‌خواهی بیشتر بدانی، ادامه مطلب را بخوان.'
  ];

  const hashtags = {
    'اضطراب': '#اضطراب #سلامت_روان #روانشناسی #آرامش_ذهن #خودشناسی #Anxiety #MentalHealth #selfcare #mindfulness #خودمراقبتی #درمان #therapy #روانشناس #بهداشت_روان',
    'افسردگی': '#افسردگی #سلامت_روان #روانشناسی #خودشناسی #Depression #MentalHealth #selfcare #mindfulness #خودمراقبتی #درمان #therapy #روانشناس #بهداشت_روان #امید',
    'روابط': '#روابط #سلامت_روان #روانشناسی #عزت_نفس #Relationships #MentalHealth #selfcare #communication #درمان #therapy #روانشناس #ازدواج',
    'عزت نفس': '#عزت_نفس #سلامت_روان #روانشناسی #自信 #SelfEsteem #MentalHealth #selfcare #selflove #خودشناسی #درمان #therapy #روانشناس #بهداشت_روان',
    'طرحواره درمانی': '#طرحواره #روانشناسی #طرحواره_درمانی #SchemaTherapy #MentalHealth #selfcare #درمان #therapy #روانشناس #بهداشت_روان #شخصیت #خودشناسی',
    'OCD': '#OCD #وسواس #سلامت_روان #روانشناسی #خودشناسی #OCD #MentalHealth #selfcare #خودمراقبتی #درمان #therapy #روانشناس #بهداشت_روان',
    'رشد فردی': '#رشد_فردی #سلامت_روان #روانشناسی #خودشناسی #PersonalGrowth #MentalHealth #selfcare #selfimprovement #motivation #درمان #therapy #روانشناس #موفقیت',
    'والدین': '#والدین #فرزندپروری #سلامت_روان #روانشناسی #Parenting #MentalHealth #خانواده #تربیت #childpsychology #selfcare #درمان #therapy #روانشناس',
    'ADHD': '#ADHD #سلامت_روان #روانشناسی #Attention #MentalHealth #selfcare #ADD #خودمراقبتی #درمان #therapy #روانشناس #بهداشت_روان #توجه',
    'ذهن‌آگاهی': '#ذهن_آگاهی #مدیتیشن #سلامت_روان #روانشناسی #Mindfulness #Meditation #MentalHealth #selfcare #آرامش #خودشناسی #درمان #therapy #روانشناس'
  };

  const dateStr = date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });

  const caption = `${hook}

${lines.join('\n')}

📞 رزرو جلسه رایگان:
واتساپ: +${WHATSAPP}

${hashtags[topic] || '#سلامت_روان #روانشناسی #MentalHealth'}`;

  return caption;
}

function generateWeekSchedule() {
  const captions = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1); // Start from tomorrow

  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const topic = getTopicForDay(i + 1);

    captions.push({
      date: date.toISOString().split('T')[0],
      datePersian: date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' }),
      topic,
      caption: generateCaption(topic, date)
    });
  }

  return captions;
}

function formatSchedule(captions) {
  let output = `# اینستاگرام راحله اوینی‌پور - @rahiltherapy\n`;
  output += `# تولید شده در: ${new Date().toLocaleDateString('fa-IR')}\n\n`;

  for (const item of captions) {
    output += `---\n`;
    output += `تاریخ: ${item.datePersian}\n`;
    output += `موضوع: ${item.topic}\n`;
    output += `---\n\n`;
    output += item.caption;
    output += `\n\n---\n\n`;
  }

  output += `\n# راهنما\n`;
  output += `- هر کپشن برای یک روز خاص است\n`;
  output += `- موضوعات هر روز چرخشی هستند (مثل بلاگ)\n`;
  output += `- کپشن را در Instagram کپی کنید و تصویر مرتبط اضافه کنید\n`;
  output += `- CTA واتساپ: +${WHATSAPP}\n`;

  return output;
}

async function main() {
  console.log('📱 Generating Instagram schedule...\n');

  const captions = generateWeekSchedule();

  for (const item of captions) {
    console.log(`📅 ${item.datePersian} - ${item.topic}`);
    console.log(item.caption.substring(0, 80) + '...\n');
  }

  const scheduleMd = formatSchedule(captions);
  const outputPath = path.join(__dirname, 'instagram-schedule.md');
  fs.writeFileSync(outputPath, scheduleMd, 'utf8');

  console.log(`\n✅ Schedule saved to: instagram-schedule.md`);
  console.log(`📊 7 captions generated for next 7 days`);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { generateCaption, generateWeekSchedule };