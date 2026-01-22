
import { Pool } from 'pg';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import 'dotenv/config';

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set in .env file");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to database...");
    const client = await pool.connect();

    try {
      console.log("Identifying existing admin user...");
      const res = await client.query("SELECT id FROM users WHERE username = $1", ["admin"]);
      
      if (res.rows.length > 0) {
        const adminId = res.rows[0].id;
        console.log(`Found existing admin with ID ${adminId}. Cleaning up related records...`);
        
        const tablesToClean = [
          "user_notification_settings",
          "attendance",
          "messages",
          "file_memberships",
          "documents",
          "notifications",
          "settings",
          "tasks"
        ];

        for (const table of tablesToClean) {
          try {
            await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [adminId]);
          } catch (e) {
            try {
               await client.query(`DELETE FROM ${table} WHERE "userId" = $1`, [adminId]);
            } catch (e2) {}
          }
        }

        try { await client.query('DELETE FROM documents WHERE "uploadedBy" = $1', [adminId]); } catch (e) {
           try { await client.query('DELETE FROM documents WHERE uploaded_by = $1', [adminId]); } catch (e2) {}
        }
        try { await client.query('DELETE FROM tasks WHERE "assignedTo" = $1 OR "createdBy" = $1', [adminId, adminId]); } catch (e) {
           try { await client.query('DELETE FROM tasks WHERE assigned_to = $1 OR created_by = $1', [adminId, adminId]); } catch (e2) {}
        }
        
        console.log("Deleting existing admin user...");
        await client.query("DELETE FROM users WHERE id = $1", [adminId]);
      }

      console.log("Hashing password...");
      const hashedPassword = await hashPassword("admin123");

      console.log("Inserting fresh admin user...");
      const columnsRes = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users'
      `);
      const columns = columnsRes.rows.map(r => r.column_name);
      
      const getActualColName = (possible: string) => {
        return columns.find(c => c.toLowerCase() === possible.toLowerCase());
      };

      const finalActiveCol = getActualColName('is_active') || getActualColName('isActive') || 'isActive';
      const finalCreateCol = getActualColName('can_create_events') || getActualColName('canCreateEvents') || 'canCreateEvents';
      const finalEditCol = getActualColName('can_edit_events') || getActualColName('canEditEvents') || 'canEditEvents';
      const finalDeleteCol = getActualColName('can_delete_events') || getActualColName('canDeleteEvents') || 'canDeleteEvents';
      const finalDisplayCol = getActualColName('display_name') || getActualColName('displayName') || 'displayName';

      // Build column list dynamically based on what exists
      const insertCols = [
        'username',
        'password',
        'role',
        `"${finalActiveCol}"`,
        `"${finalCreateCol}"`,
        `"${finalEditCol}"`,
        `"${finalDeleteCol}"`,
        `"${finalDisplayCol}"`
      ];

      // Check if is_admin or isAdmin exists just in case
      const adminCol = getActualColName('is_admin') || getActualColName('isAdmin');
      if (adminCol) {
        insertCols.push(`"${adminCol}"`);
      }

      const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
      const query = `INSERT INTO users (${insertCols.join(', ')}) VALUES (${placeholders})`;
      
      const values = [
        "admin",
        hashedPassword,
        "admin",
        true,
        true,
        true,
        true,
        "Administrator"
      ];
      
      if (adminCol) {
        values.push(true);
      }

      console.log("Running query:", query);
      await client.query(query, values);

      console.log("Admin user 'admin' created successfully with password 'admin123'");
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("Error creating admin user:", err);
  } finally {
    await pool.end();
  }
}

createAdmin();
