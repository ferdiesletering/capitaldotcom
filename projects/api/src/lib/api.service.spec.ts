import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ApiService, ApiConfigImpl } from './api.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpHeaders } from '@angular/common/http';
import { of } from 'rxjs';
import { positions } from './dummy';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let mockConfig: ApiConfigImpl;
  let headers = new HttpHeaders({
    CST: 'test-cst',
    'X-SECURITY-TOKEN': 'test-security-token',
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
    const mockTransactions = [
      { id: 1, amount: 100 },
      { id: 2, amount: 200 },
    ];

    spyOn(service, 'authenticateSession').and.returnValue(of(headers));
    service.getTransactions().subscribe((transactions) => {
      expect(transactions).toEqual(mockTransactions);
      done();
    });

    const req = httpMock.expectOne(
      `${mockConfig.baseUrl}history/transactions?type=TRADE&from=${new Date()
        .toISOString()
        .slice(0, 19)}&to=${new Date().toISOString().slice(0, 19)}`
    );
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
      },
    });

    const req = httpMock.expectOne(
      `${mockConfig.baseUrl}history/transactions?type=TRADE&from=2022-01-01T00:00:00&to=2022-01-31T00:00:00`
    );
    expect(req.request.method).toBe('GET');

    req.flush(null, { status: 400, statusText: 'Bad Request' });
  });

  it('should return headers with CST and X-SECURITY-TOKEN', () => {
    localStorage.setItem('CST', 'test-cst');
    localStorage.setItem('X-SECURITY-TOKEN', 'test-token');

    const headers = service.getHeaders();

    expect(headers.get('CST')).toEqual(localStorage.getItem('CST'));
    expect(headers.get('X-SECURITY-TOKEN')).toEqual(
      localStorage.getItem('X-SECURITY-TOKEN')
    );
  });

  it('should return headers without CST and X-SECURITY-TOKEN if not present in localStorage', () => {
    const headers = service.getHeaders();
    expect(headers.get('CST')).toEqual('');
  });

  it('should start interval and ping server', fakeAsync(() => {
    const pingUrl = `${mockConfig.baseUrl}ping`;

    // Call the function
    service.pingSession();

    tick(service.intervalTime);

    // Expect a request to be made immediately
    const req1 = httpMock.expectOne(pingUrl);
    expect(req1.request.method).toEqual('GET');
    req1.flush({});

    // Expect no more requests to be made until the interval has passed
    httpMock.expectNone(pingUrl);

    // Advance the clock and expect another request to be made
    tick(service.intervalTime);
    const req2 = httpMock.expectOne(pingUrl);
    expect(req2.request.method).toEqual('GET');
    req2.flush({});

    // Expect no more requests to be made until the interval has passed again
    httpMock.expectNone(pingUrl);

    // Unsubscribe and expect no more requests to be made
    if (service.interval$) {
      service.interval$.unsubscribe();
    }
  }));

  it('should handle errors when calling ping sesssion', fakeAsync(() => {
    const pingUrl = `${mockConfig.baseUrl}ping`;

    service.pingSession();
    tick(service.intervalTime);

    const req = httpMock.expectOne(pingUrl);
    req.flush('', { status: 500, statusText: 'Error' });
  }));

  it('should stop the ping session', () => {
    service.pingSession(); // start the ping session
    service.stopPingSession(); // stop the ping session

    expect(service['interval$']).toBeUndefined();
  });

  it('should return an Observable that throws an error', () => {
    const error = new Error('error');

    service.handleError('error').subscribe({
      error: (err) => {
        expect(err).toEqual(error);
      },
    });
  });

  it('should test the ApiConfigImpl interface', () => {
    const config = new ApiConfigImpl();
    expect(config).toBeTruthy();
  });

  it('should return positions from getOpenPositions', (done) => {
    // write a testcase for getOpenPositions
    const mockPositions = positions;

    spyOn(service, 'authenticateSession').and.returnValue(of(headers));
    service.getOpenPositions().subscribe((result: any) => {
      expect(result).toEqual(mockPositions);
      done();
    });

    const req = httpMock.expectOne(`${mockConfig.baseUrl}positions`);
    expect(req.request.method).toBe('GET');
    req.flush({ positions: mockPositions });
  });

  it('should return an Observable that throws an error for getOpenPositions', (done) => {
    const error = new Error('error');

    spyOn(service, 'authenticateSession').and.returnValue(of(headers));
    service.getOpenPositions().subscribe({
      error: (error) => {
        expect(error).toEqual(
          new Error('An error occurred while fetching positions.')
        );
        done();
      },
    });

    const req = httpMock.expectOne(`${mockConfig.baseUrl}positions`);
    req.flush('error', { status: 500, statusText: 'Error' });
  });
});
