"use server";

import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';


export async function login(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const redirectTo = formData.get('redirect') as string;

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return redirect('/login?message=Could not authenticate user');
    }

    return redirect(redirectTo && redirectTo.startsWith('/') ? redirectTo : '/');
}

export async function signup(formData: FormData) {
    const supabase = await createClient();

    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const displayName = formData.get('displayName') as string;

    // 1. Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
    });

    if (authError) {
        return redirect('/login?message=Could not create user: ' + authError.message);
    }

    // 2. Immediately create a user profile record in 'users' table
    if (authData.user) {
        const { error: profileError } = await supabase.from('users').insert({
            id: authData.user.id,
            display_name: displayName || email.split('@')[0],
            age: 30, // Default values to fulfill schema requirements if necessary
            sex: 'M',
            bodyweight: 180,
            is_onboarded: false
        });

        if (profileError) {
            console.error("Failed to create user profile string signup", profileError);
        }
    }

    return redirect('/?message=Check email to continue sign in process');
}

export async function signout() {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return redirect('/login');
}

export async function resetPassword(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get('email') as string;

    if (!email) return redirect('/login?message=Please enter your email');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password`,
    });

    if (error) {
        return redirect('/login?message=Could not send reset email');
    }

    return redirect('/login?message=Check your email for a password reset link');
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient();
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!password || password.length < 6) {
        return redirect('/reset-password?message=Password must be at least 6 characters');
    }
    if (password !== confirmPassword) {
        return redirect('/reset-password?message=Passwords do not match');
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
        return redirect('/reset-password?message=Could not update password');
    }

    return redirect('/login?message=Password updated successfully. Please log in.');
}
