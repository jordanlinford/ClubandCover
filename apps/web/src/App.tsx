import { Route, Switch } from 'wouter';
import { SignInPage } from './pages/auth/SignIn';
import { SignUpPage } from './pages/auth/SignUp';
import { ProfilePage } from './pages/Profile';
import { BooksListPage } from './pages/books/BooksList';
import { BookDetailPage } from './pages/books/BookDetail';
import { BookFormPage } from './pages/books/BookForm';
import { ClubsListPage } from './pages/clubs/ClubsList';
import { ClubDetailPage } from './pages/clubs/ClubDetail';
import { ClubFormPage } from './pages/clubs/ClubForm';
import { ClubRoomPage } from './pages/clubs/ClubRoom';
import { PitchBrowserPage } from './pages/clubs/PitchBrowser';
import { HostConsolePage } from './pages/clubs/HostConsole';
import { VotePage } from './pages/clubs/Vote';
import { PitchesListPage } from './pages/pitches/List';
import { NewPitchPage } from './pages/pitches/New';
import { PitchDetailPage } from './pages/pitches/Detail';
import { SwapsPage } from './pages/Swaps';
import { BillingPage } from './pages/Billing';
import { HomePage } from './pages/Home';
import { NotFoundPage } from './pages/NotFound';
import MessageList from './pages/messages/MessageList';
import MessageThread from './pages/messages/MessageThread';
import ModerationQueue from './pages/admin/ModerationQueue';
import ReferralDashboard from './pages/ReferralDashboard';
import DiscoverPage from './pages/Discover';
import OnboardingPage from './pages/Onboarding';
import AuthorAnalyticsPage from './pages/analytics/AuthorAnalytics';

export default function App() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/auth/sign-in" component={SignInPage} />
      <Route path="/auth/sign-up" component={SignUpPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/books" component={BooksListPage} />
      <Route path="/books/new" component={BookFormPage} />
      <Route path="/books/:id" component={BookDetailPage} />
      <Route path="/books/:id/edit" component={BookFormPage} />
      <Route path="/clubs" component={ClubsListPage} />
      <Route path="/clubs/new" component={ClubFormPage} />
      <Route path="/clubs/:id/room" component={ClubRoomPage} />
      <Route path="/clubs/:id/pitches" component={PitchBrowserPage} />
      <Route path="/clubs/:id/host-console" component={HostConsolePage} />
      <Route path="/clubs/:clubId/polls/:pollId" component={VotePage} />
      <Route path="/clubs/:id" component={ClubDetailPage} />
      <Route path="/pitches" component={PitchesListPage} />
      <Route path="/pitches/new" component={NewPitchPage} />
      <Route path="/pitches/:id" component={PitchDetailPage} />
      <Route path="/swaps" component={SwapsPage} />
      <Route path="/billing" component={BillingPage} />
      <Route path="/messages" component={MessageList} />
      <Route path="/messages/:id" component={MessageThread} />
      <Route path="/admin/moderation" component={ModerationQueue} />
      <Route path="/referrals" component={ReferralDashboard} />
      <Route path="/discover" component={DiscoverPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/analytics" component={AuthorAnalyticsPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
