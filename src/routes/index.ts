import { Route } from '@/types';
import { fontRoutes } from '@/modules/fonts';
import { fontGroupRoutes } from '@/modules/font-groups';
import {coreRoutes} from "@/modules/core";

export const routes: Route[] = [
    ...coreRoutes,
    ...fontRoutes,
    ...fontGroupRoutes,
];