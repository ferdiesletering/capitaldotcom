import { TestBed } from '@angular/core/testing';
import { ApiService, ApiConfigImpl } from './api.service';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { HttpHeaders } from '@angular/common/http';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;
  let mockConfig: ApiConfigImpl;

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
});
