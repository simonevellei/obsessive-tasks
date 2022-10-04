import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  private baseUrl: string = 'http://localhost:8080';

  constructor(private http: HttpClient) { }

  getAllTasks(): Observable<any> {
    return this.http.get(`${this.baseUrl}/task/all`);
  }

  getAllTaskers(): Observable<any> {
    return this.http.get(`${this.baseUrl}/tasker/all`);
  }

  createRootTask(): Observable<any> {
    return this.http.post(`${this.baseUrl}/task/create`, {});
  }

  createTask(parent: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/task/create/${parent}`, {});
  }

  deleteTask(id: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/task/delete/${id}`, {});
  }

  updateTask(task: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/task/update/${task.id}`, task);
  }
}
