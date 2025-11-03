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
import { SwapsPage } from './pages/Swaps';
import { BillingPage } from './pages/Billing';
import { HomePage } from './pages/Home';
import { NotFoundPage } from './pages/NotFound';

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
      <Route path="/clubs/:id" component={ClubDetailPage} />
      <Route path="/swaps" component={SwapsPage} />
      <Route path="/billing" component={BillingPage} />
      <Route component={NotFoundPage} />
    </Switch>
  );
}
