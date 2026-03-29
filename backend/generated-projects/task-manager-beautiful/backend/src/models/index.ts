
export interface User {
  id?: string;
  email: string;
  password?: string;
  name: string;
}

export interface Task {
  id?: string;
  title: string;
  description: string;
  priority: number;
  completed: boolean;
  userId?: string;
}

// Mocking Mongoose-like interface if needed, but the current code uses them as classes
// Let's create dummy classes so the code compile
export class User {
  static findOne(query: any) { return { exec: () => Promise.resolve(null) }; }
  constructor(data: any) { Object.assign(this, data); }
}

export class Task {
  static find() { return { exec: () => Promise.resolve([]) }; }
  static findById(id: string) { return { exec: () => Promise.resolve(null) }; }
  static findByIdAndDelete(id: string) { return Promise.resolve(null); }
  constructor(data: any) { Object.assign(this, data); }
  save() { return Promise.resolve(this); }
}
