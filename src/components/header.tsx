"use client"

import { useState } from "react"
import { Link, useRouterState, useRouter, useParams } from "@tanstack/react-router"
import { useSession, SignedIn, SignedOut } from "@/auth/use-auth-hooks.convex"
import { SignInButton } from "@/auth/components/SignInButton"
import { UserButton } from "@/auth/components/UserButton"
import { ModeToggle } from "@/components/mode-toggle"


export function Header() {
    const { data: session } = useSession()
    
    const pathname = useRouterState({ select: (s) => s.location.pathname })
    const search = useRouterState({ select: (s) => s.location.search })
    const router = useRouter()

    // console.log("Header session", session);

    const isPathActive = (path: string) => {
        return pathname?.startsWith(path)
    }


    return (
        <header className="sticky top-0 z-50 border-b bg-background/60 px-4 py-3 backdrop-blur w-full">
            <div className="w-full flex items-center justify-between">
                {/* Far Left - Logo / Title */}
                <div className="flex items-center gap-2">
                    <Link to="/collages" className="flex items-center gap-2">
                        <svg
                            className="size-5"
                            fill="none"
                            height="45"
                            viewBox="0 0 60 45"
                            width="60"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                className="fill-black dark:fill-white"
                                clipRule="evenodd"
                                d="M0 0H15V45H0V0ZM45 0H60V45H45V0ZM20 0H40V15H20V0ZM20 30H40V45H20V30Z"
                                fillRule="evenodd"
                            />
                        </svg>
                        mishmash.
                    </Link>
                </div>

                {/* Far Right - Auth buttons */}
                <div className="flex items-center gap-4">
                    <ModeToggle />
                    <SignedOut>
                        <SignInButton />
                    </SignedOut>
                    <SignedIn>
                        <UserButton />
                    </SignedIn>
                </div>
            </div>
        </header>
    )
}
