import { PrismaClient, UserRole, LessonType, VerificationStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data
  console.log('🗑️  Clearing existing data...');
  await prisma.notification.deleteMany();
  await prisma.liveSession.deleteMany();
  await prisma.material.deleteMany();
  await prisma.review.deleteMany();
  await prisma.report.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.lessonPackage.deleteMany();
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();
  await prisma.certification.deleteMany();
  await prisma.teacherVerification.deleteMany();
  await prisma.teacherProfile.deleteMany();
  await prisma.user.deleteMany();

  // Hash password for all users
  const hashedPassword = await bcrypt.hash('Password123!', 10);

  // Create Admin
  console.log('👤 Creating admin user...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@edutech.com',
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      avatar: 'https://ui-avatars.com/api/?name=Admin+User&background=random',
    },
  });

  // Create Teachers
  console.log('👨‍🏫 Creating teachers...');
  const teacher1 = await prisma.user.create({
    data: {
      email: 'john.teacher@edutech.com',
      password: hashedPassword,
      firstName: 'John',
      lastName: 'Smith',
      role: UserRole.TEACHER,
      avatar: 'https://ui-avatars.com/api/?name=John+Smith&background=4F46E5',
      teacherProfile: {
        create: {
          bio: 'Experienced mathematics teacher with 10+ years of teaching experience. Passionate about making math fun and accessible to everyone.',
          headline: 'Mathematics Expert | PhD in Mathematics',
          hourlyRate: 50,
          isVerified: true,
          averageRating: 4.8,
          totalStudents: 150,
          totalEarnings: 5000,
        },
      },
    },
    include: { teacherProfile: true },
  });

  const teacher2 = await prisma.user.create({
    data: {
      email: 'sarah.teacher@edutech.com',
      password: hashedPassword,
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: UserRole.TEACHER,
      avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=EC4899',
      teacherProfile: {
        create: {
          bio: 'Professional web developer and instructor. Specializing in modern JavaScript frameworks and full-stack development.',
          headline: 'Full-Stack Developer | 8 Years Experience',
          hourlyRate: 60,
          isVerified: true,
          averageRating: 4.9,
          totalStudents: 200,
          totalEarnings: 8000,
        },
      },
    },
    include: { teacherProfile: true },
  });

  const teacher3 = await prisma.user.create({
    data: {
      email: 'maria.teacher@edutech.com',
      password: hashedPassword,
      firstName: 'Maria',
      lastName: 'Garcia',
      role: UserRole.TEACHER,
      avatar: 'https://ui-avatars.com/api/?name=Maria+Garcia&background=10B981',
      teacherProfile: {
        create: {
          bio: 'Language teacher specializing in Spanish and English. Native Spanish speaker with TESOL certification.',
          headline: 'Language Instructor | TESOL Certified',
          hourlyRate: 40,
          isVerified: true,
          averageRating: 4.7,
          totalStudents: 120,
          totalEarnings: 3500,
        },
      },
    },
    include: { teacherProfile: true },
  });

  // Create Students
  console.log('👨‍🎓 Creating students...');
  const student1 = await prisma.user.create({
    data: {
      email: 'alice.student@edutech.com',
      password: hashedPassword,
      firstName: 'Alice',
      lastName: 'Brown',
      role: UserRole.STUDENT,
      avatar: 'https://ui-avatars.com/api/?name=Alice+Brown&background=F59E0B',
    },
  });

  const student2 = await prisma.user.create({
    data: {
      email: 'bob.student@edutech.com',
      password: hashedPassword,
      firstName: 'Bob',
      lastName: 'Wilson',
      role: UserRole.STUDENT,
      avatar: 'https://ui-avatars.com/api/?name=Bob+Wilson&background=3B82F6',
    },
  });

  const student3 = await prisma.user.create({
    data: {
      email: 'charlie.student@edutech.com',
      password: hashedPassword,
      firstName: 'Charlie',
      lastName: 'Davis',
      role: UserRole.STUDENT,
      avatar: 'https://ui-avatars.com/api/?name=Charlie+Davis&background=8B5CF6',
    },
  });

  // Add certifications for teachers
  console.log('📜 Adding teacher certifications...');
  await prisma.certification.createMany({
    data: [
      {
        teacherProfileId: teacher1.teacherProfile!.id,
        title: 'PhD in Mathematics',
        issuer: 'Stanford University',
        issueDate: new Date('2015-06-01'),
      },
      {
        teacherProfileId: teacher2.teacherProfile!.id,
        title: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        issueDate: new Date('2022-03-15'),
        expiryDate: new Date('2025-03-15'),
      },
      {
        teacherProfileId: teacher3.teacherProfile!.id,
        title: 'TESOL Certification',
        issuer: 'International TESOL Institute',
        issueDate: new Date('2020-08-20'),
      },
    ],
  });

  // Create verification records
  await prisma.teacherVerification.createMany({
    data: [
      {
        teacherProfileId: teacher1.teacherProfile!.id,
        documentType: 'degree',
        documentUrl: '/uploads/verifications/degree-john.pdf',
        status: VerificationStatus.APPROVED,
        reviewedBy: admin.id,
        reviewNotes: 'Verified PhD certificate',
        reviewedAt: new Date(),
      },
      {
        teacherProfileId: teacher2.teacherProfile!.id,
        documentType: 'certification',
        documentUrl: '/uploads/verifications/cert-sarah.pdf',
        status: VerificationStatus.APPROVED,
        reviewedBy: admin.id,
        reviewNotes: 'AWS certification verified',
        reviewedAt: new Date(),
      },
    ],
  });

  // Create Courses
  console.log('📚 Creating courses...');

  // Math Course
  const mathCourse = await prisma.course.create({
    data: {
      teacherProfileId: teacher1.teacherProfile!.id,
      title: 'Complete Calculus Mastery',
      description: 'Master calculus from basic concepts to advanced applications. Perfect for high school and college students.',
      category: 'Mathematics',
      thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800',
      previewVideoUrl: 'https://example.com/preview/calculus.mp4',
      isPublished: true,
    },
  });

  const webDevCourse = await prisma.course.create({
    data: {
      teacherProfileId: teacher2.teacherProfile!.id,
      title: 'Full-Stack Web Development Bootcamp',
      description: 'Learn modern web development with React, Node.js, and MongoDB. Build real-world projects.',
      category: 'Programming',
      thumbnail: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800',
      previewVideoUrl: 'https://example.com/preview/webdev.mp4',
      isPublished: true,
    },
  });

  const spanishCourse = await prisma.course.create({
    data: {
      teacherProfileId: teacher3.teacherProfile!.id,
      title: 'Spanish for Beginners',
      description: 'Start your Spanish learning journey with interactive lessons and native speaker instruction.',
      category: 'Languages',
      thumbnail: 'https://images.unsplash.com/photo-1543109740-4bdb38fda756?w=800',
      previewVideoUrl: 'https://example.com/preview/spanish.mp4',
      isPublished: true,
    },
  });

  // Create Lessons
  console.log('📖 Creating lessons...');
  await prisma.lesson.createMany({
    data: [
      // Math lessons
      {
        courseId: mathCourse.id,
        title: 'Introduction to Limits',
        description: 'Understanding the concept of limits in calculus',
        type: LessonType.RECORDED,
        duration: 45,
        videoUrl: '/uploads/videos/limits-intro.mp4',
        orderIndex: 1,
        isFree: true,
      },
      {
        courseId: mathCourse.id,
        title: 'Derivatives Basics',
        description: 'Learn how to calculate derivatives',
        type: LessonType.RECORDED,
        duration: 60,
        videoUrl: '/uploads/videos/derivatives.mp4',
        orderIndex: 2,
        isFree: false,
      },
      {
        courseId: mathCourse.id,
        title: 'Integration Techniques',
        description: 'Master integration methods',
        type: LessonType.LIVE,
        duration: 90,
        orderIndex: 3,
        isFree: false,
      },
      // Web Dev lessons
      {
        courseId: webDevCourse.id,
        title: 'HTML & CSS Fundamentals',
        description: 'Build your first web page',
        type: LessonType.RECORDED,
        duration: 120,
        videoUrl: '/uploads/videos/html-css.mp4',
        orderIndex: 1,
        isFree: true,
      },
      {
        courseId: webDevCourse.id,
        title: 'JavaScript ES6+',
        description: 'Modern JavaScript features',
        type: LessonType.RECORDED,
        duration: 150,
        videoUrl: '/uploads/videos/javascript.mp4',
        orderIndex: 2,
        isFree: false,
      },
      {
        courseId: webDevCourse.id,
        title: 'React Fundamentals',
        description: 'Component-based UI development',
        type: LessonType.HYBRID,
        duration: 180,
        orderIndex: 3,
        isFree: false,
      },
      // Spanish lessons
      {
        courseId: spanishCourse.id,
        title: 'Spanish Alphabet & Pronunciation',
        description: 'Learn Spanish sounds and letters',
        type: LessonType.RECORDED,
        duration: 30,
        videoUrl: '/uploads/videos/spanish-alphabet.mp4',
        orderIndex: 1,
        isFree: true,
      },
      {
        courseId: spanishCourse.id,
        title: 'Basic Greetings & Introductions',
        description: 'Common Spanish phrases',
        type: LessonType.LIVE,
        duration: 45,
        orderIndex: 2,
        isFree: false,
      },
    ],
  });

  // Create Lesson Packages
  console.log('💰 Creating lesson packages...');
  const mathPackage = await prisma.lessonPackage.create({
    data: {
      courseId: mathCourse.id,
      name: 'Complete Calculus Bundle',
      description: 'Access to all calculus lessons and materials',
      price: 199.99,
      discount: 20,
      finalPrice: 179.99,
      duration: 90,
      features: JSON.stringify([
        'Lifetime access',
        '20+ video lessons',
        'Practice problems',
        'Certificate of completion',
        'Direct teacher support',
      ]),
      isActive: true,
    },
  });

  const webDevPackage = await prisma.lessonPackage.create({
    data: {
      courseId: webDevCourse.id,
      name: 'Web Developer Pro',
      description: 'Complete full-stack development program',
      price: 299.99,
      discount: 50,
      finalPrice: 249.99,
      duration: 180,
      maxStudents: 50,
      features: JSON.stringify([
        'Lifetime access',
        '40+ hours of content',
        'Real-world projects',
        'Code reviews',
        'Job assistance',
        'Certificate',
      ]),
      isActive: true,
    },
  });

  const spanishPackage = await prisma.lessonPackage.create({
    data: {
      courseId: spanishCourse.id,
      name: 'Spanish Beginner Package',
      description: 'Start speaking Spanish confidently',
      price: 149.99,
      discount: 10,
      finalPrice: 139.99,
      duration: 60,
      maxStudents: 20,
      features: JSON.stringify([
        '3 months access',
        'Live conversation practice',
        'Downloadable materials',
        'Progress tracking',
      ]),
      isActive: true,
    },
  });

  // Create Enrollments and Payments
  console.log('🎓 Creating enrollments...');
  const enrollment1 = await prisma.enrollment.create({
    data: {
      userId: student1.id,
      packageId: mathPackage.id,
      progress: 65,
      completedLessons: 2,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.payment.create({
    data: {
      userId: student1.id,
      packageId: mathPackage.id,
      amount: 179.99,
      platformCommission: 17.99,
      teacherEarning: 162.00,
      status: 'COMPLETED',
      paidAt: new Date(),
    },
  });

  const enrollment2 = await prisma.enrollment.create({
    data: {
      userId: student2.id,
      packageId: webDevPackage.id,
      progress: 30,
      completedLessons: 1,
      expiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.payment.create({
    data: {
      userId: student2.id,
      packageId: webDevPackage.id,
      amount: 249.99,
      platformCommission: 24.99,
      teacherEarning: 225.00,
      status: 'COMPLETED',
      paidAt: new Date(),
    },
  });

  await prisma.enrollment.create({
    data: {
      userId: student3.id,
      packageId: spanishPackage.id,
      progress: 100,
      completedLessons: 2,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
    },
  });

  // Create Reviews
  console.log('⭐ Creating reviews...');
  await prisma.review.create({
    data: {
      enrollmentId: enrollment1.id,
      reviewerId: student1.id,
      teacherId: teacher1.id,
      rating: 5,
      comment: 'Excellent teacher! Made calculus easy to understand.',
      isPublished: true,
    },
  });

  await prisma.review.create({
    data: {
      enrollmentId: enrollment2.id,
      reviewerId: student2.id,
      teacherId: teacher2.id,
      rating: 5,
      comment: 'Best web development course I have taken. Very practical and hands-on!',
      isPublished: true,
    },
  });

  // Create Materials
  console.log('📄 Creating course materials...');
  await prisma.material.createMany({
    data: [
      {
        courseId: mathCourse.id,
        title: 'Calculus Formula Sheet',
        description: 'Essential formulas and theorems',
        fileUrl: '/uploads/materials/calculus-formulas.pdf',
        fileType: 'pdf',
        fileSize: 524288,
        isDownloadable: true,
      },
      {
        courseId: webDevCourse.id,
        title: 'JavaScript Cheat Sheet',
        description: 'Quick reference for JS syntax',
        fileUrl: '/uploads/materials/js-cheatsheet.pdf',
        fileType: 'pdf',
        fileSize: 1048576,
        isDownloadable: true,
      },
    ],
  });

  // Create Notifications
  console.log('🔔 Creating notifications...');
  await prisma.notification.createMany({
    data: [
      {
        userId: student1.id,
        title: 'Welcome to Edutech!',
        message: 'Thank you for joining our platform. Start exploring courses now!',
        type: 'welcome',
      },
      {
        userId: student1.id,
        title: 'Course Progress Update',
        message: 'You have completed 65% of Complete Calculus Mastery. Keep going!',
        type: 'progress',
        isRead: true,
      },
      {
        userId: teacher1.id,
        title: 'New Student Enrolled',
        message: 'Alice Brown has enrolled in your Complete Calculus Mastery course.',
        type: 'enrollment',
      },
      {
        userId: teacher2.id,
        title: 'You received a 5-star review!',
        message: 'Bob Wilson left a great review for your Web Development course.',
        type: 'review',
        isRead: false,
      },
    ],
  });

  // Create a sample report
  await prisma.report.create({
    data: {
      reporterId: student2.id,
      reportedId: teacher3.id,
      type: 'QUALITY_ISSUE',
      description: 'Some audio quality issues in lesson 2',
      status: 'RESOLVED',
      resolution: 'Audio has been rerecorded and updated',
      resolvedAt: new Date(),
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Created:');
  console.log('  - 1 Admin');
  console.log('  - 3 Teachers');
  console.log('  - 3 Students');
  console.log('  - 3 Courses');
  console.log('  - 8 Lessons');
  console.log('  - 3 Packages');
  console.log('  - 3 Enrollments');
  console.log('  - 2 Reviews');
  console.log('  - 4 Notifications');
  console.log('\n🔐 Test Credentials:');
  console.log('  Admin: admin@edutech.com / Password123!');
  console.log('  Teacher: john.teacher@edutech.com / Password123!');
  console.log('  Student: alice.student@edutech.com / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
