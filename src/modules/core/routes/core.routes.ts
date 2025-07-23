import {Route} from '@/types';
import {CoreController} from '@/modules/core/controllers/core.controller';

const coreController = new CoreController();

export const coreRoutes: Route[] = [
    {
        method: 'GET',
        path: '/',
        handler: coreController.home.bind(coreController)
    },
    {
        method: 'GET',
        path: '/api/health',
        handler: coreController.health.bind(coreController)
    },
    {
        method: 'GET',
        path: '/api/docs',
        handler: coreController.docs.bind(coreController)
    },
    {
        method: 'GET',
        path: '/api/openapi.yaml',
        handler: coreController.openApiSpec.bind(coreController)
    }
];