import { Component } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { CommonModule, DatePipe } from '@angular/common';

export interface UserData {
  id: number;
  name: string;
  email: string;
  role: string;
}

const SAMPLE_DATA: UserData[] = Array.from({ length: 100 }, (_, k) => ({
  id: k + 1,
  name: `User ${k + 1}`,
  email: `user${k + 1}@example.com`,
  role: k % 2 === 0 ? 'Admin' : 'Member'
}));

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MatTableModule, MatToolbarModule, MatCardModule, CommonModule, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  displayedColumns: string[] = ['id', 'name', 'email', 'role'];
  dataSource = new MatTableDataSource<UserData>(SAMPLE_DATA);
  today = new Date();
}
