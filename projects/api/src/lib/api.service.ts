import { Injectable } from '@angular/core';
import { map, mergeMap, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';

interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  encryptedPassword: string;
  identifier: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(
    private config: ApiConfigImpl,
    private httpClient: HttpClient
  ) {}

  private getHeaders() {
    return new HttpHeaders({
      CST: localStorage.getItem('CST') || '',
      'X-SECURITY-TOKEN': localStorage.getItem('X-SECURITY-TOKEN') || '',
    });
  }

  public authenticateSession() {
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
          return res;
        })
      );
  }

  public getTransactions(from: Date = new Date(), to: Date = new Date()) {
    const headers = this.getHeaders();

    const formatFrom = from.toISOString().slice(0, 19);
    const formatTo = to.toISOString().slice(0, 19);

    this.httpClient
      .get(
        `${this.config.baseUrl}history/activity?from=${formatFrom}&to=${formatTo}&detailed=true&filter=type==POSITION`,
        { headers: headers }
      )
      .subscribe((x) => {
        console.log(x);
      });

    return this.authenticateSession().pipe(
      mergeMap(() =>
        this.httpClient.get(
          `${this.config.baseUrl}history/transactions?type=TRADE&from=${formatFrom}&to=${formatTo}`,
          { headers: headers }
        )
      ),
      map((res: any) => res.transactions)
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
