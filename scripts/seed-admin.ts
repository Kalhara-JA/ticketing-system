// scripts/seed-admin.ts
import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/index.js'
import { auth } from '../src/lib/auth/auth' // your better-auth instance (same one Next.js uses)

const prisma = new PrismaClient()

async function upsertAdmin() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD ?? 'Admin123!'
  const name = process.env.ADMIN_NAME ?? 'System Administrator'
  const username = process.env.ADMIN_USERNAME ?? 'admin'

  console.log('🌱 Seeding admin user with:', { email, username, name })

  // If the user already exists, upsert all admin details including password
  const existing = await prisma.user.findFirst({ where: { email } })
  if (existing) {
    // Update basic details
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: 'admin',
        name: name,
        username: username
      }
    })

    // Update password using Better Auth's internal hashing
    try {
      // Use Better Auth's internal password hashing by creating a temporary signup
      // and then updating the existing account with the hashed password
      const tempResult = await auth.api.signUpEmail({
        body: { name: 'temp', email: 'temp@temp.com', password, username: 'temp' }
      })

      // Get the hashed password from the temporary account
      const tempAccount = await prisma.account.findFirst({
        where: { userId: tempResult.user.id, providerId: 'credential' }
      })

      if (tempAccount?.password) {
        // Update the existing admin's password with the properly hashed one
        await prisma.account.updateMany({
          where: {
            userId: existing.id,
            providerId: 'credential'
          },
          data: {
            password: tempAccount.password
          }
        })

        // Clean up the temporary user and account
        await prisma.account.deleteMany({ where: { userId: tempResult.user.id } })
        await prisma.user.delete({ where: { id: tempResult.user.id } })

        console.log('🔐 Password updated for existing admin')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.log('⚠️  Could not update password, but admin details updated:', errorMessage)
    }

    console.log('✅ Admin already exists, updated details:', { email, username, name, role: 'admin' })
    return
  }

  // Create via Better Auth so password is scrypt-hashed
  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password, username }, // Better Auth writes user + account (providerId='credential')
    })

    // Update role to admin and mark email as verified (Better Auth creates users as 'user' by default)
    await prisma.user.update({
      where: { id: result.user.id },
      data: {
        role: 'admin'
      },
    })

    console.log('✅ Admin seeded via Better Auth:', { email, username, id: result.user.id })
  } catch (error) {
    console.error('❌ Failed to create admin user via Better Auth:', error)
    throw error
  }
}

upsertAdmin()
  .then(() => {
    console.log('🎉 Admin seeding completed successfully!')
  })
  .catch((e) => {
    console.error('💥 Admin seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
