import { Injectable } from '@angular/core';
import {
  Observable,
  catchError,
  interval,
  map,
  mergeMap,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  encryptedPassword: string;
  identifier: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private readonly intervalTime = 3 * 60 * 1000;
  private interval$: Observable<any> | undefined;

  constructor(private config: ApiConfigImpl, private httpClient: HttpClient) {}

  private getHeaders() {
    return new HttpHeaders({
      CST: localStorage.getItem('CST') || '',
      'X-SECURITY-TOKEN': localStorage.getItem('X-SECURITY-TOKEN') || '',
    });
  }

  public authenticateSession():Observable<HttpHeaders> {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-CAP-API-KEY': this.config.apiKey,
    });

    let data = {
      encryptedPassword: this.config.encryptedPassword,
      identifier: this.config.identifier,
      password: this.config.password,
    };

    return this.httpClient
      .post(`${this.config.baseUrl}session`, data, {
        headers: headers,
        observe: 'response',
      })
      .pipe(
        map((res) => {
          localStorage.setItem('CST', res.headers.get('CST') || '');
          localStorage.setItem(
            'X-SECURITY-TOKEN',
            res.headers.get('X-SECURITY-TOKEN') || ''
          );

          return new HttpHeaders({
            'Content-Type': 'application/json',
            'X-SECURITY-TOKEN': res.headers.get('X-SECURITY-TOKEN') || '',
            'CST': res.headers.get('CST') || '',
          });
        }),
        tap(() => this.pingSession())
      );
  }

  public pingSession() {
    if (!this.interval$) {
      this.interval$ = interval(this.intervalTime).pipe(
        switchMap(() =>
          this.httpClient.get(`${this.config.baseUrl}ping`, {
            headers: this.getHeaders(),
          })
        ),
        catchError(() => this.handleError())
      );
    }

    this.interval$.subscribe(() => console.log('ping service'));
  }

  private handleError(): Observable<never> {
    return throwError(() => new Error('Cannot ping service'));
  }

  public getTransactions(from: Date = new Date(), to: Date = new Date()) {
    const formatFrom = from.toISOString().slice(0, 19);
    const formatTo = to.toISOString().slice(0, 19);

    return this.authenticateSession().pipe(
      mergeMap((headers:HttpHeaders) => {
        return this.httpClient.get(
          `${this.config.baseUrl}history/transactions?type=TRADE&from=${formatFrom}&to=${formatTo}`,
          { headers: headers }
        );
      }),
      map((res: any) => res.transactions),
      catchError(() => {
        return throwError(() => 'An error occurred while fetching transactions.');
      })
    );
  }

  getOpenPositions() {
    const headers = this.getHeaders();

    this.httpClient
      .get(`${this.config.baseUrl}positions`, { headers: headers })
      .subscribe((x) => {
        console.log(x);
      });
  }
}

export class ApiConfigImpl implements ApiConfig {
  apiKey: string;
  baseUrl: string;
  encryptedPassword: string;
  identifier: string;
  password: string;

  constructor() {
    // Set your default config values here or load them from a config file
    this.apiKey = '';
    this.baseUrl = '';
    this.encryptedPassword = '';
    this.identifier = '';
    this.password = '';
  }
}
