<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class AdminUserSeeder extends Seeder
{
    /**
     * Create the admin user from ADMIN_EMAIL / ADMIN_PASSWORD only when it
     * does not exist yet.
     *
     * The entrypoint runs `db:seed` on every container start, so this must
     * never touch the password of an existing account: the admin may have
     * changed it from the panel, and overwriting it here would silently
     * revert that change and lock them out on the next deploy.
     * (Lesson from laVillaSB commit 0b34aec.)
     */
    public function run(): void
    {
        $email = env('ADMIN_EMAIL') ?: 'admin@saludinteligente.lat';

        if (User::where('email', $email)->exists()) {
            return;
        }

        $password = env('ADMIN_PASSWORD') ?: null;

        if (! $password) {
            $password = Str::password(24);
            Log::warning('Generated admin password for seeding. Store it securely.', [
                'email' => $email,
                'password' => $password,
            ]);
        }

        User::create([
            'name' => 'Admin',
            'email' => $email,
            'password' => Hash::make($password),
            'is_admin' => true,
        ]);
    }
}
