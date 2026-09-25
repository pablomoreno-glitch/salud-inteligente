<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_login_returns_a_token_with_the_admin_ability(): void
    {
        $admin = User::factory()->create([
            'email' => 'admin@saludinteligente.lat',
            'password' => Hash::make('secret-password'),
            'is_admin' => true,
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'secret-password',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.id', $admin->id)
            ->assertJsonPath('user.email', $admin->email)
            ->assertJsonStructure(['token']);

        $this->assertTrue($admin->fresh()->tokens()->first()->can('admin'));
    }

    public function test_wrong_credentials_are_rejected_with_a_spanish_message(): void
    {
        $admin = User::factory()->create([
            'password' => Hash::make('secret-password'),
            'is_admin' => true,
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)
            ->assertJsonPath('error', 'Las credenciales son incorrectas.')
            ->assertJsonPath('errors.email.0', 'Las credenciales son incorrectas.');
    }

    public function test_a_non_admin_user_cannot_log_into_the_admin_panel(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('secret-password'),
            'is_admin' => false,
        ]);

        $response = $this->postJson('/api/admin/login', [
            'email' => $user->email,
            'password' => 'secret-password',
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_admin_dashboard_requires_authentication(): void
    {
        $this->getJson('/api/admin/dashboard')
            ->assertUnauthorized()
            ->assertExactJson(['error' => 'No autenticado']);
    }

    public function test_an_invalid_token_without_accept_header_gets_a_json_401(): void
    {
        // Plain `call` sends no Accept header, like curl or an integration would.
        $response = $this->call('PATCH', '/api/admin/inventory/VW-158', [], [], [], [
            'HTTP_AUTHORIZATION' => 'Bearer not-a-real-token',
            'CONTENT_TYPE' => 'application/json',
        ], '{"quantity":3}');

        $response->assertUnauthorized()->assertExactJson(['error' => 'No autenticado']);
    }

    public function test_a_non_admin_token_is_forbidden_from_admin_routes(): void
    {
        $user = User::factory()->create(['is_admin' => false]);
        $token = $user->createToken('phpunit', ['admin'])->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/me')
            ->assertForbidden()
            ->assertExactJson(['error' => 'No autorizado']);
    }

    public function test_a_token_without_the_admin_ability_is_forbidden(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $token = $admin->createToken('phpunit', ['other-ability'])->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/me')->assertForbidden();
    }

    public function test_me_returns_the_authenticated_admin(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $token = $admin->createToken('phpunit', ['admin'])->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/me')
            ->assertOk()
            ->assertJsonPath('id', $admin->id);
    }

    public function test_logout_revokes_the_current_token(): void
    {
        $admin = User::factory()->create(['is_admin' => true]);
        $token = $admin->createToken('phpunit', ['admin']);

        $this->withToken($token->plainTextToken)
            ->postJson('/api/admin/logout')
            ->assertOk();

        $this->assertDatabaseMissing('personal_access_tokens', ['id' => $token->accessToken->id]);
    }

    public function test_login_is_throttled_after_five_attempts(): void
    {
        $payload = ['email' => 'missing@example.com', 'password' => 'wrong'];

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/api/admin/login', $payload)->assertStatus(422);
        }

        $this->postJson('/api/admin/login', $payload)->assertTooManyRequests();
    }
}
