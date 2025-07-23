import { Route } from '@/types';
import { fontGroupController } from '@/modules/font-groups/controllers/font-group.controller';

export const fontGroupRoutes: Route[] = [
    {
        method: 'POST',
        path: '/api/font-groups',
        handler: fontGroupController.createFontGroup.bind(fontGroupController)
    },
    {
        method: 'GET',
        path: '/api/font-groups',
        handler: fontGroupController.getAllFontGroups.bind(fontGroupController)
    },
    {
        method: 'DELETE',
        path: '/api/font-groups/bulk-delete',
        handler: fontGroupController.bulkDeleteFontGroups.bind(fontGroupController)
    },
    {
        method: 'GET',
        path: '/api/font-groups/:id',
        handler: fontGroupController.getFontGroupById.bind(fontGroupController)
    },
    {
        method: 'PUT',
        path: '/api/font-groups/:id',
        handler: fontGroupController.updateFontGroup.bind(fontGroupController)
    },
    {
        method: 'DELETE',
        path: '/api/font-groups/:id',
        handler: fontGroupController.deleteFontGroup.bind(fontGroupController)
    },
];