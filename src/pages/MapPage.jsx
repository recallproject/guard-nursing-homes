import { Navigate, useSearchParams } from 'react-router-dom';
import SettingHomePage from './SettingHomePage';

/**
 * /skilled-nursing setting home.
 * Old MapPage stacked LandingV5 on a map — that stack is gone.
 * Legacy ?state=XX bookmarks still land on /state/XX lists.
 */
export function MapPage() {
  const [searchParams] = useSearchParams();
  const stateParam = (searchParams.get('state') || '').toUpperCase();
  const city = searchParams.get('city');
  const q = searchParams.get('q');

  if (stateParam) {
    const query = city || q || '';
    return <Navigate to={`/state/${stateParam}${query ? `?q=${encodeURIComponent(query)}` : ''}`} replace />;
  }

  return <SettingHomePage settingId="snf" />;
}
