import { Router } from 'express'
import { protect } from '../middleware/auth.js'
import User from '../models/User.js'

const router = Router()

const CURRICULUM = {
  physics: {
    name: 'Physics', emoji: '⚛️', color: '#00c8ff',
    chapters: [
      { id: 'ph-01', title: 'Introduction to Physics',  lessons: 5,  topics: ['What is physics','Scientific method','Units & measurement','Vectors','Scalars'] },
      { id: 'ph-02', title: 'Motion & Kinematics',      lessons: 8,  topics: ['Displacement','Velocity','Acceleration','Free fall','Projectile motion','Relative motion','Graphs of motion','Problem solving'] },
      { id: 'ph-03', title: "Forces & Newton's Laws",   lessons: 7,  topics: ["Newton's 1st law",'2nd law','3rd law','Friction','Normal force','Tension','Free body diagrams'] },
      { id: 'ph-04', title: 'Energy & Work',            lessons: 6,  topics: ['Work','Kinetic energy','Potential energy','Conservation of energy','Power','Simple machines'] },
      { id: 'ph-05', title: 'Waves & Sound',            lessons: 9,  topics: ['Wave properties','Transverse waves','Longitudinal waves','Sound speed','Frequency','Pitch','Resonance','Doppler effect','Interference'] },
      { id: 'ph-06', title: 'Electricity & Magnetism',  lessons: 10, topics: ['Electric charge','Electric field','Voltage','Current','Resistance','Ohm\'s law','Circuits','Magnetism','Induction','Electromagnetic waves'] },
      { id: 'ph-07', title: 'Quantum Physics',          lessons: 8,  topics: ['Wave-particle duality','Photoelectric effect','Atomic models','Uncertainty principle','Quantum states','Tunnelling','Nuclear physics','Radioactivity'] },
    ]
  },
  math: {
    name: 'Mathematics', emoji: '🧮', color: '#a78bfa',
    chapters: [
      { id: 'ma-01', title: 'Number Systems',      lessons: 4,  topics: ['Natural numbers','Integers','Rational numbers','Irrational numbers'] },
      { id: 'ma-02', title: 'Algebra Basics',      lessons: 7,  topics: ['Variables','Expressions','Equations','Inequalities','Factoring','Polynomials','Rational expressions'] },
      { id: 'ma-03', title: 'Geometry',            lessons: 6,  topics: ['Points lines planes','Angles','Triangles','Circles','Area & perimeter','Volume','Coordinate geometry'] },
      { id: 'ma-04', title: 'Trigonometry',        lessons: 8,  topics: ['Right triangles','SOH-CAH-TOA','Unit circle','Trig identities','Law of sines','Law of cosines','Inverse trig','Graphs'] },
      { id: 'ma-05', title: 'Calculus Intro',      lessons: 10, topics: ['Limits','Continuity','Derivatives','Rules of differentiation','Chain rule','Implicit differentiation','Integrals','Fundamental theorem','Applications'] },
      { id: 'ma-06', title: 'Differential Equations', lessons: 9, topics: ['ODEs','Separable equations','Linear first order','Exact equations','Systems of ODEs','Laplace transforms','Applications','Numerical methods','PDEs intro'] },
    ]
  },
  cs: {
    name: 'Computer Science', emoji: '💻', color: '#10b981',
    chapters: [
      { id: 'cs-01', title: 'Python Basics',         lessons: 6,  topics: ['Variables & types','Control flow','Functions','Lists & dicts','File I/O','Error handling'] },
      { id: 'cs-02', title: 'Data Structures',       lessons: 8,  topics: ['Arrays','Linked lists','Stacks','Queues','Hash tables','Trees','Heaps','Graphs'] },
      { id: 'cs-03', title: 'Algorithms',            lessons: 10, topics: ['Big-O notation','Sorting','Searching','Recursion','Divide & conquer','Dynamic programming','Greedy','Graph algorithms','String algorithms'] },
      { id: 'cs-04', title: 'OOP',                   lessons: 7,  topics: ['Classes & objects','Encapsulation','Inheritance','Polymorphism','Abstraction','Design patterns','SOLID principles'] },
      { id: 'cs-05', title: 'Web Development',       lessons: 9,  topics: ['HTML','CSS','JavaScript','React basics','REST APIs','Databases','Authentication','Deployment','Testing'] },
      { id: 'cs-06', title: 'Machine Learning Intro',lessons: 12, topics: ['What is ML','Supervised learning','Linear regression','Classification','Decision trees','Neural networks','CNNs','NLP basics','Model evaluation','Overfitting','Feature engineering','Project'] },
    ]
  },
  bio: {
    name: 'Biology', emoji: '🧬', color: '#f59e0b',
    chapters: [
      { id: 'bi-01', title: 'Cell Biology',     lessons: 7, topics: ['Cell theory','Prokaryotes vs eukaryotes','Cell membrane','Organelles','Cell division','Mitosis','Meiosis'] },
      { id: 'bi-02', title: 'Genetics',         lessons: 8, topics: ['DNA structure','Replication','Transcription','Translation','Mutations','Mendelian genetics','Inheritance patterns','Gene expression'] },
      { id: 'bi-03', title: 'Evolution',        lessons: 6, topics: ['Natural selection','Adaptation','Speciation','Fossil record','Phylogenetics','Human evolution','Mechanisms of evolution'] },
      { id: 'bi-04', title: 'Ecology',          lessons: 5, topics: ['Ecosystems','Food webs','Biomes','Population dynamics','Symbiosis','Nutrient cycles','Climate change'] },
      { id: 'bi-05', title: 'Human Anatomy',    lessons: 10, topics: ['Skeletal','Muscular','Nervous','Cardiovascular','Respiratory','Digestive','Endocrine','Immune','Urinary','Reproductive'] },
    ]
  },
  islam: {
    name: 'Islamic Studies', emoji: '☪️', color: '#f59e0b',
    chapters: [
      { id: 'is-01', title: 'Foundations of Islam',      lessons: 5, topics: ['The six pillars of Iman','Tawheed','Prophets & messengers','Divine books','Angels','Day of Judgement'] },
      { id: 'is-02', title: 'Five Pillars of Islam',     lessons: 6, topics: ['Shahada','Salah (prayer)','Zakat','Sawm (fasting)','Hajj','Importance of pillars'] },
      { id: 'is-03', title: 'Quran & Tajweed',           lessons: 10, topics: ['Introduction to Quran','Makharij al-huroof','Tajweed rules','Noon & Meem Mushaddad','Madd','Waqf','Common mistakes','Surah Al-Fatiha','Memorisation tips','Tafseer basics'] },
      { id: 'is-04', title: 'Hadith Sciences',           lessons: 7, topics: ['What is Hadith','Chain of narration (isnad)','Classification','40 Hadith Nawawi','Sahih Bukhari & Muslim','Hadith in daily life','Common misconceptions'] },
      { id: 'is-05', title: 'Seerah (Prophet Biography)',lessons: 8, topics: ['Arabia before Islam','Birth of Prophet ﷺ','First revelation','Early Islam in Mecca','Hijra to Medina','Battles & treaties','Conquest of Mecca','Final years','Legacy'] },
      { id: 'is-06', title: 'Fiqh (Islamic Law)',        lessons: 9, topics: ['Sources of Fiqh','Taharah (purity)','Salah in detail','Zakat calculation','Business ethics','Family law','Halal & haram','Contemporary issues','Madhabs'] },
    ]
  },
}

/* GET /api/learn/curriculum */
router.get('/curriculum', protect, (_req, res) => {
  const summary = Object.entries(CURRICULUM).map(([id, s]) => ({
    id,
    name:     s.name,
    emoji:    s.emoji,
    color:    s.color,
    chapters: s.chapters.length,
    totalLessons: s.chapters.reduce((a, c) => a + c.lessons, 0),
  }))
  res.json({ subjects: summary })
})

/* GET /api/learn/curriculum/:subjectId */
router.get('/curriculum/:subjectId', protect, (req, res) => {
  const subject = CURRICULUM[req.params.subjectId]
  if (!subject) return res.status(404).json({ message: 'Subject not found' })
  res.json({ subject: { id: req.params.subjectId, ...subject } })
})

/* GET /api/learn/curriculum/:subjectId/:chapterId */
router.get('/curriculum/:subjectId/:chapterId', protect, (req, res) => {
  const subject = CURRICULUM[req.params.subjectId]
  if (!subject) return res.status(404).json({ message: 'Subject not found' })
  const chapter = subject.chapters.find(c => c.id === req.params.chapterId)
  if (!chapter) return res.status(404).json({ message: 'Chapter not found' })
  res.json({ chapter, subject: { id: req.params.subjectId, name: subject.name } })
})

/* GET /api/learn/progress */
router.get('/progress', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
    res.json({ progress: Object.fromEntries(user.progress || []) })
  } catch (err) { next(err) }
})

/* POST /api/learn/complete-lesson */
router.post('/complete-lesson', protect, async (req, res, next) => {
  try {
    const { subjectId, chapterId } = req.body
    if (!subjectId) return res.status(400).json({ message: 'subjectId required' })

    const subject  = CURRICULUM[subjectId]
    if (!subject)  return res.status(404).json({ message: 'Subject not found' })

    const user     = await User.findById(req.user._id)
    const totalLessons = subject.chapters.reduce((a, c) => a + c.lessons, 0)
    const current  = user.progress.get(subjectId) || 0
    const increment = Math.round(100 / totalLessons)
    const newPct   = Math.min(100, current + increment)

    user.progress.set(subjectId, newPct)
    user.xp += 15
    await user.save()

    res.json({ progress: newPct, xp: user.xp, message: `+15 XP! Progress: ${newPct}%` })
  } catch (err) { next(err) }
})

export default router
