
export class AuthService {
  async verifyFirebaseToken(idToken: string) {
    // Mocking Firebase token verification
    return "mock-token-" + idToken.substring(0, 5);
  }

  async hashPassword(password: string) {
    return "hashed-" + password;
  }

  async registerUser(userData: any) {
    return { ...userData, id: "mock-user-id" };
  }
}

export default new AuthService();
