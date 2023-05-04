import { TestBed } from '@angular/core/testing';
import { ApiService, ApiConfigImpl } from './api.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let mockConfig: ApiConfigImpl;
  let headers = new HttpHeaders({
    'CST': 'test-cst', 'X-SECURITY-TOKEN': 'test-security-token'
  });

  beforeEach(() => {
    mockConfig = {
      apiKey: 'mockApiKey',
      baseUrl: 'https://example.com/api/',
      encryptedPassword: 'mockEncryptedPassword',
      identifier: 'mockIdentifier',
      password: 'mockPassword',
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService, { provide: ApiConfigImpl, useValue: mockConfig }],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should authenticate session with correct credentials and store tokens in localStorage', () => {
    // Define the expected response from the server
    const mockResponseHeaders = new HttpHeaders({
      CST: 'mock-cst',
      'X-SECURITY-TOKEN': 'mock-security-token',
    });
    const mockResponseBody = {
      encryptedPassword: mockConfig.encryptedPassword,
      identifier: mockConfig.identifier,
      password: mockConfig.password,
    };

    // Make the HTTP request
    service.authenticateSession().subscribe({
      next: (res) => {
        // Expect localStorage items to have been set
        expect(localStorage.getItem('CST')).toEqual('mock-cst');
        expect(localStorage.getItem('X-SECURITY-TOKEN')).toEqual(
          'mock-security-token'
        );
      },
      error: () => {
        fail('Authentication should have succeeded.');
      },
    });

    // Expect a single POST request to the session endpoint with the expected headers and data
    const req = httpMock.expectOne(`${mockConfig.baseUrl}session`);
    expect(req.request.method).toEqual('POST');
    expect(req.request.headers.get('Content-Type')).toEqual('application/json');
    expect(req.request.headers.get('X-CAP-API-KEY')).toEqual(mockConfig.apiKey);
    expect(req.request.body).toEqual(mockResponseBody);

    // Respond with the expected response
    req.flush(mockResponseBody, {
      headers: mockResponseHeaders,
      status: 200,
      statusText: 'OK',
    });
  });


  it('should return transactions from the server', (done) => {
    const mockTransactions = [{ id: 1, amount: 100 }, { id: 2, amount: 200 }];

    spyOn(service, 'authenticateSession').and.returnValue(of(headers));
    service.getTransactions().subscribe((transactions) => {
      expect(transactions).toEqual(mockTransactions);
      done();
    });

    const req = httpMock.expectOne(`${mockConfig.baseUrl}history/transactions?type=TRADE&from=${new Date().toISOString().slice(0, 19)}&to=${new Date().toISOString().slice(0, 19)}`);
    expect(req.request.method).toBe('GET');
    req.flush({ transactions: mockTransactions });
  });

  it('should handle errors when fetching transactions', (done) => {
    spyOn(service, 'authenticateSession').and.returnValue(of(headers));
    const fromDate = new Date('2022-01-01');
    const toDate = new Date('2022-01-31');

    service.getTransactions(fromDate, toDate).subscribe({
      next: () => {
        fail('getTransactions() should have thrown an error');
      },
      error: (error) => {
        expect(error).toBe('An error occurred while fetching transactions.');
        done();
      }
    });

    const req = httpMock.expectOne(
      `${mockConfig.baseUrl}history/transactions?type=TRADE&from=2022-01-01T00:00:00&to=2022-01-31T00:00:00`
    );
    expect(req.request.method).toBe('GET');

    req.flush(null, {status: 400, statusText: 'Bad Request'});
  });
});
