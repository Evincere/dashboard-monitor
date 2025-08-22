import { NextApiRequest, NextApiResponse } from 'next';
import { getReportHandler } from '../../../../lib/reports/handlers/reportHandlers';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    return getReportHandler(req, res);
}
