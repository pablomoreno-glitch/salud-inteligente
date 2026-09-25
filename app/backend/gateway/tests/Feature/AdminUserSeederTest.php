<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\AdminUserSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminUserSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_the_admin_user_from_env_when_missing(): void
    {
        putenv('ADMIN_EMAIL=admin@saludinteligente.lat');
        putenv('ADMIN_PASSWORD=super-secret');

        (new AdminUserSeeder)->run();

        $this->assertDatabaseHas('users', [
            'email' => 'admin@saludinteligente.lat',
            'is_admin' => true,
        ]);

        $admin = User::where('email', 'admin@saludinteligente.lat')->first();
        $this->assertTrue(Hash::check('super-secret', $admin->password));

        putenv('ADMIN_EMAIL');
        putenv('ADMIN_PASSWORD');
    }

    public function test_it_never_resets_the_password_of_an_existing_admin(): void
    {
        putenv('ADMIN_EMAIL=admin@saludinteligente.lat');
        putenv('ADMIN_PASSWORD=original-password');

        $admin = User::factory()->create([
            'email' => 'admin@saludinteligente.lat',
            'password' => Hash::make('changed-from-the-panel'),
            'is_admin' => true,
        ]);

        // Simulate the entrypoint re-running db:seed on every deploy with the
        // same env password: the account already exists, so the seeder must
        // be a no-op and the admin's changed password must survive.
        (new AdminUserSeeder)->run();

        $this->assertTrue(Hash::check('changed-from-the-panel', $admin->fresh()->password));

        putenv('ADMIN_EMAIL');
        putenv('ADMIN_PASSWORD');
    }
}
