export interface UserData {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  disclaimerAccepted: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  id: string;
  email: string;
  passwordHash: string;
  name: string | null;
  disclaimerAccepted: boolean;
  role: string;
  createdAt: Date;
  updatedAt: Date;

  constructor({ id, email, passwordHash, name, disclaimerAccepted, role, createdAt, updatedAt }: UserData) {
    this.id = id;
    this.email = email;
    this.passwordHash = passwordHash;
    this.name = name || null;
    this.disclaimerAccepted = disclaimerAccepted || false;
    this.role = role || 'user';
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  toPublic() {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      disclaimerAccepted: this.disclaimerAccepted,
      role: this.role,
      createdAt: this.createdAt,
    };
  }
}

export default User;
