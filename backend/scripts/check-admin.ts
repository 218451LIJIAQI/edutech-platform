import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://edutech:HZb6xqdGwbEZBnrUSEg3IAtBjQqhzXTo@dpg-d4me0hjuibrs738gvq40-a.singapore-postgres.render.com/edutech_u5qs'
    }
  }
});

async function createAndCheck() {
  // Create admin
  const existing = await prisma.user.findUnique({ where: { email: 'admin@gmail.com' } });
  if (!existing) {
    const hash = await bcrypt.hash('Admin123456', 10);
    await prisma.user.create({
      data: {
        email: 'admin@gmail.com',
        password: hash,
        firstName: 'System',
        lastName: 'Admin',
        role: 'ADMIN',
        isActive: true
      }
    });
    console.log('Admin created!');
  } else {
    console.log('Admin already exists');
  }

  // Check all users
  const users = await prisma.user.findMany({
    select: { email: true, role: true }
  });
  console.log('Users:', JSON.stringify(users));
  await prisma.$disconnect();
}

createAndCheck();
