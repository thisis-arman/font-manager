import {fontController} from "@/modules/fonts";
import {Route} from "@/types";

export const fontRoutes: Route[] = [
    {
        method: 'POST',
        path: '/api/fonts/upload',
        handler: fontController.uploadFont.bind(fontController)
    },
    {
        method: 'POST',
        path: '/api/fonts/validate',
        handler: fontController.validateFont.bind(fontController)
    },
    {
        method: 'GET',
        path: '/api/fonts',
        handler: fontController.getAllFonts.bind(fontController)
    },
    {
        method: 'GET',
        path: '/api/fonts/:id',
        handler: fontController.getFontById.bind(fontController)
    },
    {
        method: 'DELETE',
        path: '/api/fonts/bulk-delete',
        handler: fontController.bulkDeleteFonts.bind(fontController)
    },
    {
        method: 'DELETE',
        path: '/api/fonts/:id',
        handler: fontController.deleteFont.bind(fontController)
    },
    {
        method: 'GET',
        path: '/api/fonts/:id/preview',
        handler: fontController.getFontPreview.bind(fontController)
    },
    {
        method: 'GET',
        path: '/uploads/:filename',
        handler: fontController.serveFont.bind(fontController)
    }
];