import { COMPARE_BRIEF_SAMPLE_CCNS } from '../utils/compareBriefOffer';
import { CompareBriefDownload } from './CompareBriefDownload';

/** Free preview of the paid Compare Brief, using three Louisiana homes. */
export default function CompareBriefSamplePage() {
  return <CompareBriefDownload ccns={COMPARE_BRIEF_SAMPLE_CCNS} sample />;
}
