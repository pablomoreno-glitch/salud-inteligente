<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminPasswordTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->create([
            'email' => 'admin@saludinteligente.lat',
            'password' => Hash::make('current-password-123'),
            'is_admin' => true,
        ]);
    }

    private function token(string $name = 'admin-panel'): string
    {
        return $this->admin->createToken($name, ['admin'])->plainTextToken;
    }

    public function test_admin_changes_the_password_and_can_log_in_with_the_new_one(): void
    {
        $this->withToken($this->token())->putJson('/api/admin/password', [
            'current_password' => 'current-password-123',
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'a-brand-new-password',
        ])->assertOk()->assertJsonPath('message', 'Contraseña actualizada.');

        $this->assertTrue(Hash::check('a-brand-new-password', $this->admin->fresh()->password));
        $this->postJson('/api/admin/login', ['email' => 'admin@saludinteligente.lat', 'password' => 'current-password-123'])
            ->assertStatus(422);
    }

    public function test_the_current_password_is_required_and_checked(): void
    {
        $this->withToken($this->token())->putJson('/api/admin/password', [
            'current_password' => 'wrong-password',
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'a-brand-new-password',
        ])->assertStatus(422)->assertJsonPath('error', 'La contraseña actual no es correcta.');

        $this->assertTrue(Hash::check('current-password-123', $this->admin->fresh()->password));
    }

    public function test_weak_or_mismatched_passwords_are_rejected(): void
    {
        $token = $this->token();
        $this->withToken($token)->putJson('/api/admin/password', [
            'current_password' => 'current-password-123',
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertStatus(422)->assertJsonPath('error', 'La nueva contraseña debe tener al menos 12 caracteres.');

        $this->withToken($token)->putJson('/api/admin/password', [
            'current_password' => 'current-password-123',
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'something-else-entirely',
        ])->assertStatus(422)->assertJsonPath('error', 'La confirmación no coincide con la nueva contraseña.');
    }

    public function test_other_sessions_are_signed_out_but_this_one_stays(): void
    {
        $other = $this->token('other-device');
        $mine = $this->token();

        $this->withToken($mine)->putJson('/api/admin/password', [
            'current_password' => 'current-password-123',
            'password' => 'a-brand-new-password',
            'password_confirmation' => 'a-brand-new-password',
        ])->assertOk();

        $this->assertSame(1, $this->admin->tokens()->count());
        $this->assertSame('admin-panel', $this->admin->tokens()->first()->name);
        $this->app['auth']->forgetGuards();
        $this->withToken($other)->getJson('/api/admin/me')->assertUnauthorized();
    }

    public function test_it_requires_being_signed_in(): void
    {
        $this->putJson('/api/admin/password', [])->assertUnauthorized();
    }
}
