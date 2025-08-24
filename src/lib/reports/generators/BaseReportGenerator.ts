import { executeQuery, executeQuerySingle } from '../../db/mysql';

export abstract class BaseReportGenerator {
    protected async executeQuery<T = any>(query: string, params: any[] = []): Promise<T[]> {
        return executeQuery<T>(query, params);
    }

    protected async executeQuerySingle<T = any>(query: string, params: any[] = []): Promise<T | null> {
        return executeQuerySingle<T>(query, params);
    }

    abstract generate(contestId?: number): Promise<any>;
}
